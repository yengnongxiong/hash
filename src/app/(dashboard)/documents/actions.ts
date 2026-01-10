"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOCRProvider } from "@/lib/ocr/provider";
import { revalidatePath } from "next/cache";
import { detectDocumentFlags, saveDocumentFlags } from "@/lib/ocr/detect-flags";
import { ExtractedDocumentData } from "@/lib/ocr/types";

/**
 * Generates a 6-character random alphanumeric document ID
 * Format: mix of uppercase letters and numbers (e.g., "A3B7K2", "9X4M2P")
 */
function generateDocumentId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluded I, O, 0, 1 to avoid confusion
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient();

  const file = formData.get("file") as File;
  const customerId = formData.get("customerId") as string | null;

  if (!file) {
    return { error: "No file provided" };
  }

  // Validate file type
  const allowedTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
  ];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Invalid file type. Allowed: PDF, PNG, JPG, WebP" };
  }

  // Validate file size (50MB)
  if (file.size > 50 * 1024 * 1024) {
    return { error: "File too large. Maximum size is 50MB" };
  }

  // Get user and organization
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) {
    return { error: "No organization found" };
  }

  const orgId = userData.organization_id;

  try {
    // Generate unique file path
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${orgId}/${timestamp}-${safeName}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return { error: `Upload failed: ${uploadError.message}` };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("documents")
      .getPublicUrl(filePath);

    // Generate unique document ID
    const documentNumber = generateDocumentId();

    // Create document record
    const { data: document, error: dbError } = await supabase
      .from("documents")
      .insert({
        organization_id: orgId,
        customer_id: customerId || null,
        document_number: documentNumber,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        status: "pending",
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      return { error: `Failed to save document: ${dbError.message}` };
    }

    // Create audit log entry
    await supabase.from("document_audit_log").insert({
      document_id: document.id,
      user_id: user.id,
      action: "uploaded",
      details: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      },
    });

    // Trigger OCR processing in background
    // Note: In production, you'd want to use a queue/background job
    processDocumentOCR(document.id).catch((err) => {
      console.error("Background OCR processing error:", err);
    });

    revalidatePath("/documents");
    return { success: true, documentId: document.id };
  } catch (error) {
    console.error("Upload error:", error);
    return {
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

async function processDocumentOCR(documentId: string) {
  const adminClient = createAdminClient();

  // Update status to processing
  await adminClient
    .from("documents")
    .update({ status: "processing" })
    .eq("id", documentId);

  try {
    // Get document details
    const { data: document } = await adminClient
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (!document) {
      throw new Error("Document not found");
    }

    // Process with OCR
    const ocrProvider = getOCRProvider();
    const isImage = document.file_type?.startsWith("image/");

    const result = isImage
      ? await ocrProvider.processImage(document.file_url)
      : await ocrProvider.processDocument(
          document.file_url,
          document.file_type || "application/pdf"
        );

    if (!result.success) {
      throw new Error(result.error || "OCR processing failed");
    }

    // Update document with results - set to pending_review for human approval
    await adminClient
      .from("documents")
      .update({
        status: "pending_review",
        raw_text: result.rawText,
        document_type: result.extractedData.documentType || "other",
        extracted_data: JSON.parse(JSON.stringify(result.extractedData)),
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    // Remove any previous ocr_failed entries since OCR now succeeded
    // This prevents confusing double-logging in the activity feed
    await adminClient
      .from("document_audit_log")
      .delete()
      .eq("document_id", documentId)
      .eq("action", "ocr_failed");

    // Create audit log entry
    await adminClient.from("document_audit_log").insert({
      document_id: documentId,
      action: "ocr_completed",
      details: {
        pageCount: result.pages.length,
        documentType: result.extractedData.documentType,
      },
    });

    // Detect and save document flags
    try {
      const flags = await detectDocumentFlags(
        documentId,
        result.extractedData as ExtractedDocumentData
      );
      if (flags.length > 0) {
        await saveDocumentFlags(documentId, flags);
        // Log flag detection
        await adminClient.from("document_audit_log").insert({
          document_id: documentId,
          action: "flags_detected",
          details: {
            flagCount: flags.length,
            flags: flags.map((f) => ({ type: f.flag_type, severity: f.severity })),
          },
        });
      }
    } catch (flagError) {
      console.error("Flag detection error:", flagError);
      // Don't fail the whole process if flag detection fails
    }

    // Extract and save document dates
    try {
      await saveDocumentDates(documentId, result.extractedData as ExtractedDocumentData, adminClient);
    } catch (dateError) {
      console.error("Date extraction error:", dateError);
      // Don't fail the whole process if date extraction fails
    }
  } catch (error) {
    console.error("OCR processing error:", error);

    // Update status to failed
    await adminClient
      .from("documents")
      .update({
        status: "failed",
        extracted_data: {
          error: error instanceof Error ? error.message : "Processing failed",
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    // Create audit log entry
    await adminClient.from("document_audit_log").insert({
      document_id: documentId,
      action: "ocr_failed",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

export async function getDocuments() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .select("*, customers(name, company)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deleteDocuments(documentIds: string[], permanent = false) {
  const supabase = await createClient();

  if (documentIds.length === 0) {
    return { error: "No documents selected" };
  }

  if (permanent) {
    // Permanent delete - remove from storage and database
    const { data: documents } = await supabase
      .from("documents")
      .select("id, file_url")
      .in("id", documentIds);

    // Delete from storage
    if (documents) {
      for (const doc of documents) {
        // Extract path from URL
        const url = new URL(doc.file_url);
        const pathMatch = url.pathname.match(/\/documents\/(.+)/);
        if (pathMatch) {
          await supabase.storage.from("documents").remove([pathMatch[1]]);
        }
      }
    }

    // Delete from database
    const { error } = await supabase
      .from("documents")
      .delete()
      .in("id", documentIds);

    if (error) {
      return { error: error.message };
    }
  } else {
    // Soft delete - set deleted_at timestamp
    const { error } = await supabase
      .from("documents")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", documentIds);

    if (error) {
      return { error: error.message };
    }

    // Log the soft delete action
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      for (const docId of documentIds) {
        await supabase.from("document_audit_log").insert({
          document_id: docId,
          user_id: user.id,
          action: "deleted",
          details: { soft_delete: true },
        });
      }
    }
  }

  revalidatePath("/documents");
  return { success: true, count: documentIds.length };
}

export async function restoreDocuments(documentIds: string[]) {
  const supabase = await createClient();

  if (documentIds.length === 0) {
    return { error: "No documents selected" };
  }

  // Restore by clearing deleted_at
  const { error } = await supabase
    .from("documents")
    .update({ deleted_at: null })
    .in("id", documentIds);

  if (error) {
    return { error: error.message };
  }

  // Log the restore action
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    for (const docId of documentIds) {
      await supabase.from("document_audit_log").insert({
        document_id: docId,
        user_id: user.id,
        action: "restored",
        details: {},
      });
    }
  }

  revalidatePath("/documents");
  return { success: true, count: documentIds.length };
}

export async function retryDocumentOCR(documentId: string) {
  const supabase = await createClient();

  // Verify document belongs to user's org
  const { data: document } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .single();

  if (!document) {
    return { error: "Document not found" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Log retry action
  if (user) {
    await supabase.from("document_audit_log").insert({
      document_id: documentId,
      user_id: user.id,
      action: "ocr_retry",
      details: {},
    });
  }

  // Reset status and trigger reprocessing
  await supabase
    .from("documents")
    .update({ status: "pending", extracted_data: {} })
    .eq("id", documentId);

  processDocumentOCR(documentId).catch((err) => {
    console.error("Retry OCR processing error:", err);
  });

  revalidatePath("/documents");
  return { success: true };
}

export async function approveDocument(documentId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Verify document belongs to user's org and is pending_review
  const { data: document } = await supabase
    .from("documents")
    .select("id, status")
    .eq("id", documentId)
    .single();

  if (!document) {
    return { error: "Document not found" };
  }

  if (document.status !== "pending_review") {
    return { error: "Document is not pending review" };
  }

  // Update document status to completed and record approval
  const { error: updateError } = await supabase
    .from("documents")
    .update({
      status: "completed",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Create audit log entry
  await supabase.from("document_audit_log").insert({
    document_id: documentId,
    user_id: user.id,
    action: "approved",
    details: {},
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/documents/review");
  return { success: true };
}

export async function rejectDocument(documentId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Verify document belongs to user's org and is pending_review
  const { data: document } = await supabase
    .from("documents")
    .select("id, status")
    .eq("id", documentId)
    .single();

  if (!document) {
    return { error: "Document not found" };
  }

  if (document.status !== "pending_review") {
    return { error: "Document is not pending review" };
  }

  // Update document status to rejected
  const { error: updateError } = await supabase
    .from("documents")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Create audit log entry
  await supabase.from("document_audit_log").insert({
    document_id: documentId,
    user_id: user.id,
    action: "rejected",
    details: {},
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/documents/review");
  return { success: true };
}

export async function bulkApproveDocuments(documentIds: string[]) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (documentIds.length === 0) {
    return { error: "No documents selected" };
  }

  // Verify all documents are pending_review
  const { data: documents } = await supabase
    .from("documents")
    .select("id, status")
    .in("id", documentIds);

  if (!documents || documents.length === 0) {
    return { error: "No documents found" };
  }

  const pendingDocs = documents.filter((d) => d.status === "pending_review");
  if (pendingDocs.length === 0) {
    return { error: "No documents pending review" };
  }

  const pendingIds = pendingDocs.map((d) => d.id);

  // Bulk update documents
  const { error: updateError } = await supabase
    .from("documents")
    .update({
      status: "completed",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in("id", pendingIds);

  if (updateError) {
    return { error: updateError.message };
  }

  // Create audit log entries for each document
  const auditEntries = pendingIds.map((docId) => ({
    document_id: docId,
    user_id: user.id,
    action: "approved",
    details: { bulk: true },
  }));

  await supabase.from("document_audit_log").insert(auditEntries);

  revalidatePath("/documents");
  revalidatePath("/documents/review");
  return { success: true, count: pendingIds.length };
}

export async function logDocumentView(documentId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Only log view once per session (check if viewed in last 5 minutes)
    // Using a shorter window (1 minute) to reduce race condition window
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

    // Get the most recent view to check timing more accurately
    const { data: recentView } = await supabase
      .from("document_audit_log")
      .select("id, created_at")
      .eq("document_id", documentId)
      .eq("user_id", user.id)
      .eq("action", "viewed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // If there's a recent view within the last minute, skip logging
    if (recentView && new Date(recentView.created_at) >= new Date(oneMinuteAgo)) {
      return; // Already logged recently
    }

    // Insert the view log - errors are caught and silently ignored
    // since view logging is informational and non-critical
    await supabase.from("document_audit_log").insert({
      document_id: documentId,
      user_id: user.id,
      action: "viewed",
      details: {},
    });
  } catch (error) {
    // Silently ignore view logging errors - they're non-critical
    // and shouldn't break the page load
    console.error("View logging error (non-critical):", error);
  }
}

export async function getDocumentAuditLog(documentId: string) {
  const supabase = await createClient();
  const PAGE_SIZE = 20;

  // Get total count
  const { count } = await supabase
    .from("document_audit_log")
    .select("*", { count: "exact", head: true })
    .eq("document_id", documentId);

  // Get initial batch of logs (without relationship join to avoid TypeScript issues)
  const { data: logs, error } = await supabase
    .from("document_audit_log")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (error || !logs) {
    return { logs: [], total: 0 };
  }

  // Fetch users separately for logs that have user_id
  const userIds = [...new Set(logs.filter(l => l.user_id).map(l => l.user_id as string))];
  let usersMap: Record<string, { name: string | null; email: string }> = {};

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", userIds);

    if (users) {
      usersMap = Object.fromEntries(users.map(u => [u.id, { name: u.name, email: u.email }]));
    }
  }

  // Attach users to logs
  const logsWithUsers = logs.map(log => ({
    ...log,
    users: log.user_id ? usersMap[log.user_id] || null : null,
  }));

  return { logs: logsWithUsers, total: count || 0 };
}

export async function getDocumentFlags(documentId: string) {
  const supabase = await createClient();

  // Fetch flags first
  const { data: flags, error } = await supabase
    .from("document_flags")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching document flags:", error);
    return [];
  }

  if (!flags || flags.length === 0) {
    return [];
  }

  // Get unique resolved_by user IDs
  const resolvedByIds = [...new Set(flags.map(f => f.resolved_by).filter(Boolean))] as string[];

  // Fetch users who resolved flags
  const { data: users } = resolvedByIds.length > 0
    ? await supabase
        .from("users")
        .select("id, name, email")
        .in("id", resolvedByIds)
    : { data: [] };

  // Map users by ID for quick lookup
  const usersMap = new Map(users?.map(u => [u.id, u]) || []);

  // Attach resolved_by_user to each flag
  return flags.map(flag => ({
    ...flag,
    resolved_by_user: flag.resolved_by ? usersMap.get(flag.resolved_by) || null : null,
  }));
}

// Helper function to extract and save document dates from OCR results
async function saveDocumentDates(
  documentId: string,
  extractedData: ExtractedDocumentData,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any
) {
  const datesToInsert: Array<{
    document_id: string;
    date_type: string;
    date_value: string;
    label: string;
    is_manual: boolean;
  }> = [];

  // Extract known date fields based on document type
  const dateFieldMappings: Array<{
    field: keyof ExtractedDocumentData;
    type: string;
    label: string;
  }> = [
    { field: "dueDate", type: "due_date", label: "Due Date" },
    { field: "invoiceDate", type: "invoice_date", label: "Invoice Date" },
    { field: "expirationDate", type: "expiration", label: "Expiration Date" },
    { field: "effectiveDate", type: "effective", label: "Effective Date" },
    { field: "transactionDate", type: "transaction", label: "Transaction Date" },
  ];

  for (const mapping of dateFieldMappings) {
    const dateValue = extractedData[mapping.field];
    if (dateValue && typeof dateValue === "string" && isValidDate(dateValue)) {
      datesToInsert.push({
        document_id: documentId,
        date_type: mapping.type,
        date_value: dateValue,
        label: mapping.label,
        is_manual: false,
      });
    }
  }

  // Also extract dates from the general dates array
  if (extractedData.dates && Array.isArray(extractedData.dates)) {
    for (const dateItem of extractedData.dates) {
      if (dateItem.date && isValidDate(dateItem.date)) {
        // Map the type to our enum
        const typeMap: Record<string, string> = {
          due_date: "due_date",
          invoice_date: "invoice_date",
          expiration: "expiration",
          effective: "effective",
          transaction: "transaction",
        };
        const dateType = typeMap[dateItem.type] || "other";

        // Check if we already have this date
        const exists = datesToInsert.some(
          (d) => d.date_value === dateItem.date && d.date_type === dateType
        );

        if (!exists) {
          datesToInsert.push({
            document_id: documentId,
            date_type: dateType,
            date_value: dateItem.date,
            label: dateItem.context || formatDateType(dateType),
            is_manual: false,
          });
        }
      }
    }
  }

  if (datesToInsert.length === 0) {
    return;
  }

  // Delete existing auto-extracted dates for this document (keep manual ones)
  await adminClient
    .from("document_dates")
    .delete()
    .eq("document_id", documentId)
    .eq("is_manual", false);

  // Insert new dates
  const { error } = await adminClient
    .from("document_dates")
    .insert(datesToInsert);

  if (error) {
    console.error("Error saving document dates:", error);
  }
}

// Helper to validate date format
function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

// Helper to format date type for display
function formatDateType(type: string): string {
  const labels: Record<string, string> = {
    due_date: "Due Date",
    invoice_date: "Invoice Date",
    expiration: "Expiration Date",
    effective: "Effective Date",
    transaction: "Transaction Date",
    other: "Other Date",
  };
  return labels[type] || "Date";
}

export async function getDocumentDates(documentId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("document_dates")
    .select("*")
    .eq("document_id", documentId)
    .order("date_value", { ascending: true });

  if (error) {
    console.error("Error fetching document dates:", error);
    return [];
  }

  return data || [];
}

export async function addDocumentDate(
  documentId: string,
  dateType: string,
  dateValue: string,
  label?: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("document_dates")
    .insert({
      document_id: documentId,
      date_type: dateType,
      date_value: dateValue,
      label: label || formatDateType(dateType),
      is_manual: true,
    });

  if (error) {
    return { error: error.message };
  }

  // Create audit log
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("document_audit_log").insert({
    document_id: documentId,
    user_id: user?.id,
    action: "date_added",
    details: {
      dateType,
      dateValue,
      label,
    },
  });

  revalidatePath(`/documents/${documentId}`);
  return { success: true };
}

export async function deleteDocumentDate(documentId: string, dateId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("document_dates")
    .delete()
    .eq("id", dateId)
    .eq("document_id", documentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/documents/${documentId}`);
  return { success: true };
}

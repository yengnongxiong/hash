"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOCRProvider } from "@/lib/ocr/provider";
import { revalidatePath } from "next/cache";
import { detectDocumentFlags, saveDocumentFlags } from "@/lib/ocr/detect-flags";
import { ExtractedDocumentData } from "@/lib/ocr/types";

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

    // Create document record
    const { data: document, error: dbError } = await supabase
      .from("documents")
      .insert({
        organization_id: orgId,
        customer_id: customerId || null,
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

    // Update document with results
    await adminClient
      .from("documents")
      .update({
        status: "completed",
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

export async function deleteDocuments(documentIds: string[]) {
  const supabase = await createClient();

  if (documentIds.length === 0) {
    return { error: "No documents selected" };
  }

  // Get file paths before deleting
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

export async function logDocumentView(documentId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Only log view once per session (check if viewed in last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: recentView } = await supabase
    .from("document_audit_log")
    .select("id")
    .eq("document_id", documentId)
    .eq("user_id", user.id)
    .eq("action", "viewed")
    .gte("created_at", fiveMinutesAgo)
    .limit(1);

  if (recentView && recentView.length > 0) {
    return; // Already logged recently
  }

  await supabase.from("document_audit_log").insert({
    document_id: documentId,
    user_id: user.id,
    action: "viewed",
    details: {},
  });
}

export async function getDocumentAuditLog(documentId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("document_audit_log")
    .select("*, users(name, email)")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return [];
  }

  return data || [];
}

export async function getDocumentFlags(documentId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("document_flags")
    .select("*, resolved_by_user:users!document_flags_resolved_by_fkey(name, email)")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching document flags:", error);
    return [];
  }

  return data || [];
}

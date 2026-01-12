"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============ Version Management ============

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  extracted_data: Record<string, unknown>;
  raw_text: string | null;
  document_type: string | null;
  change_summary: string | null;
  changed_fields: string[];
  created_by: string | null;
  created_at: string;
  created_by_user?: {
    name: string | null;
    email: string;
  };
}

/**
 * Get the next version number for a document
 */
async function getNextVersionNumber(supabase: Awaited<ReturnType<typeof createClient>>, documentId: string): Promise<number> {
  const { data } = await supabase
    .from("document_versions")
    .select("version_number")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();

  return (data?.version_number || 0) + 1;
}

/**
 * Save a new version snapshot of a document
 */
export async function saveDocumentVersion(
  documentId: string,
  extractedData: Record<string, unknown>,
  options?: {
    rawText?: string | null;
    documentType?: string | null;
    changeSummary?: string | null;
    changedFields?: string[];
  }
): Promise<{ success: boolean; versionNumber?: number; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const versionNumber = await getNextVersionNumber(supabase, documentId);

  const { error } = await supabase.from("document_versions").insert({
    document_id: documentId,
    version_number: versionNumber,
    extracted_data: JSON.parse(JSON.stringify(extractedData)),
    raw_text: options?.rawText || null,
    document_type: options?.documentType || null,
    change_summary: options?.changeSummary || null,
    changed_fields: options?.changedFields || [],
    created_by: user?.id || null,
  });

  if (error) {
    console.error("Error saving document version:", error);
    return { success: false, error: error.message };
  }

  return { success: true, versionNumber };
}

/**
 * Get version history for a document
 */
export async function getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("document_versions")
    .select(`
      id,
      document_id,
      version_number,
      extracted_data,
      raw_text,
      document_type,
      change_summary,
      changed_fields,
      created_by,
      created_at,
      created_by_user:users!document_versions_created_by_fkey(name, email)
    `)
    .eq("document_id", documentId)
    .order("version_number", { ascending: false });

  if (error) {
    console.error("Error fetching document versions:", error);
    return [];
  }

  return (data || []) as unknown as DocumentVersion[];
}

/**
 * Get a specific version of a document
 */
export async function getDocumentVersion(
  documentId: string,
  versionNumber: number
): Promise<DocumentVersion | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("document_versions")
    .select(`
      id,
      document_id,
      version_number,
      extracted_data,
      raw_text,
      document_type,
      change_summary,
      changed_fields,
      created_by,
      created_at,
      created_by_user:users!document_versions_created_by_fkey(name, email)
    `)
    .eq("document_id", documentId)
    .eq("version_number", versionNumber)
    .single();

  if (error) {
    console.error("Error fetching document version:", error);
    return null;
  }

  return data as unknown as DocumentVersion;
}

/**
 * Restore a document to a previous version
 */
export async function restoreDocumentVersion(
  documentId: string,
  versionNumber: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get the version to restore
  const version = await getDocumentVersion(documentId, versionNumber);
  if (!version) {
    return { success: false, error: "Version not found" };
  }

  // Get current document data to save as a new version before restoring
  const { data: currentDoc } = await supabase
    .from("documents")
    .select("extracted_data, raw_text, document_type")
    .eq("id", documentId)
    .single();

  if (currentDoc) {
    // Save current state as a new version before restoring
    await saveDocumentVersion(documentId, currentDoc.extracted_data as Record<string, unknown>, {
      rawText: currentDoc.raw_text,
      documentType: currentDoc.document_type,
      changeSummary: `Snapshot before restoring to version ${versionNumber}`,
    });
  }

  // Update document with version data
  const { error: updateError } = await supabase
    .from("documents")
    .update({
      extracted_data: JSON.parse(JSON.stringify(version.extracted_data)),
      document_type: version.document_type,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Create audit log
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("document_audit_log").insert({
    document_id: documentId,
    user_id: user?.id,
    action: "version_restored",
    details: {
      restoredToVersion: versionNumber,
    },
  });

  revalidatePath(`/documents/${documentId}`);
  return { success: true };
}

// ============ Document Field Updates ============

/**
 * Update a single field in document's extracted_data with version history.
 * Different from bulk updateDocumentExtractedData in documents/actions.ts.
 * Uses optimistic locking to prevent concurrent edit conflicts.
 */
export async function updateDocumentField(
  documentId: string,
  field: string,
  value: string | number | null,
  expectedUpdatedAt?: string // Optional optimistic lock timestamp
) {
  const supabase = await createClient();

  // Get current document
  const { data: document, error: fetchError } = await supabase
    .from("documents")
    .select("extracted_data, raw_text, document_type, updated_at")
    .eq("id", documentId)
    .single();

  if (fetchError || !document) {
    return { error: "Document not found" };
  }

  // Check optimistic lock if provided
  if (expectedUpdatedAt && document.updated_at !== expectedUpdatedAt) {
    return {
      error: "Document was modified by another user. Please refresh and try again.",
      conflictDetected: true,
      currentUpdatedAt: document.updated_at,
    };
  }

  // Save current state as a version before modifying
  const currentData = (document.extracted_data || {}) as Record<string, unknown>;

  // Only save a version if this is a meaningful change
  const oldValue = currentData[field];
  if (oldValue !== value) {
    await saveDocumentVersion(documentId, currentData, {
      rawText: document.raw_text,
      documentType: document.document_type,
      changeSummary: `Before editing field: ${field}`,
      changedFields: [field],
    });
  }

  // Update the specific field in extracted_data
  const updatedData = {
    ...currentData,
    [field]: value,
  };

  const newUpdatedAt = new Date().toISOString();

  // Save to database with optimistic lock check
  let query = supabase
    .from("documents")
    .update({
      extracted_data: JSON.parse(JSON.stringify(updatedData)),
      updated_at: newUpdatedAt,
    })
    .eq("id", documentId);

  // If expectedUpdatedAt provided, add optimistic lock condition
  if (expectedUpdatedAt) {
    query = query.eq("updated_at", expectedUpdatedAt);
  }

  const { data: updateResult, error: updateError } = await query.select("id").single();

  if (updateError) {
    // PGRST116 = no rows returned, means optimistic lock failed
    if (updateError.code === "PGRST116") {
      return {
        error: "Document was modified by another user. Please refresh and try again.",
        conflictDetected: true,
      };
    }
    return { error: updateError.message };
  }

  if (!updateResult) {
    return {
      error: "Document was modified by another user. Please refresh and try again.",
      conflictDetected: true,
    };
  }

  // Create audit log
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("document_audit_log").insert({
    document_id: documentId,
    user_id: user?.id,
    action: "field_edited",
    details: JSON.parse(JSON.stringify({
      field,
      oldValue,
      newValue: value,
    })),
  });

  revalidatePath(`/documents/${documentId}`);
  return { success: true };
}

export async function linkDocumentToCustomer(
  documentId: string,
  customerId: string | null
) {
  const supabase = await createClient();

  // Get current document to check previous customer
  const { data: document } = await supabase
    .from("documents")
    .select("customer_id")
    .eq("id", documentId)
    .single();

  const previousCustomerId = document?.customer_id;

  const { error } = await supabase
    .from("documents")
    .update({
      customer_id: customerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (error) {
    return { error: error.message };
  }

  // Create audit log for link/unlink action
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (customerId) {
    // Get customer name for audit log
    const { data: customer } = await supabase
      .from("customers")
      .select("name, company")
      .eq("id", customerId)
      .single();

    await supabase.from("document_audit_log").insert({
      document_id: documentId,
      user_id: user?.id,
      action: "linked_customer",
      details: {
        customerId,
        customerName: customer?.name || "Unknown",
        customerCompany: customer?.company,
      },
    });
  } else if (previousCustomerId) {
    // Get previous customer name for audit log
    const { data: previousCustomer } = await supabase
      .from("customers")
      .select("name, company")
      .eq("id", previousCustomerId)
      .single();

    await supabase.from("document_audit_log").insert({
      document_id: documentId,
      user_id: user?.id,
      action: "unlinked_customer",
      details: {
        previousCustomerId,
        previousCustomerName: previousCustomer?.name || "Unknown",
      },
    });
  }

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/documents");
  return { success: true };
}

export async function logDocumentDownload(documentId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("document_audit_log").insert({
    document_id: documentId,
    user_id: user?.id,
    action: "downloaded",
    details: {},
  });
}

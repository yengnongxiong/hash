"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateDocumentExtractedData(
  documentId: string,
  field: string,
  value: string | number | null
) {
  const supabase = await createClient();

  // Get current document
  const { data: document, error: fetchError } = await supabase
    .from("documents")
    .select("extracted_data")
    .eq("id", documentId)
    .single();

  if (fetchError || !document) {
    return { error: "Document not found" };
  }

  // Update the specific field in extracted_data
  const currentData = (document.extracted_data || {}) as Record<string, unknown>;
  const updatedData = {
    ...currentData,
    [field]: value,
  };

  // Save to database
  const { error: updateError } = await supabase
    .from("documents")
    .update({
      extracted_data: JSON.parse(JSON.stringify(updatedData)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Create audit log
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("document_audit_log").insert({
    document_id: documentId,
    user_id: user?.id,
    action: "field_edited",
    details: {
      field,
      newValue: value,
    },
  });

  revalidatePath(`/documents/${documentId}`);
  return { success: true };
}

export async function linkDocumentToCustomer(
  documentId: string,
  customerId: string | null
) {
  const supabase = await createClient();

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

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/documents");
  return { success: true };
}

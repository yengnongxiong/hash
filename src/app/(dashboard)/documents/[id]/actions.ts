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

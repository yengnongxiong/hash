"use server";

import { createClient } from "@/lib/supabase/server";
import { ExtractedDocumentData } from "./types";

export interface DetectedFlag {
  flag_type: "past_due" | "duplicate_invoice" | "suspicious_amount" | "missing_data" | "other";
  severity: "info" | "warning" | "critical";
  message: string;
  details: Record<string, unknown>;
}

export async function detectDocumentFlags(
  documentId: string,
  extractedData: ExtractedDocumentData
): Promise<DetectedFlag[]> {
  const flags: DetectedFlag[] = [];
  const supabase = await createClient();

  // Check for past due dates
  if (extractedData.dueDate) {
    const dueDate = new Date(extractedData.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      flags.push({
        flag_type: "past_due",
        severity: daysOverdue > 30 ? "critical" : daysOverdue > 7 ? "warning" : "info",
        message: `Invoice is ${daysOverdue} days past due`,
        details: {
          dueDate: extractedData.dueDate,
          daysOverdue,
        },
      });
    }
  }

  // Check for duplicate invoice numbers using indexed query
  if (extractedData.invoiceNumber) {
    // Use a targeted query filtering by document_type for better performance
    const { data: existingDocs } = await supabase
      .from("documents")
      .select("id, file_name, extracted_data")
      .neq("id", documentId)
      .eq("status", "completed")
      .eq("document_type", "invoice")
      .limit(100); // Limit results for safety

    if (existingDocs) {
      for (const doc of existingDocs) {
        const docData = doc.extracted_data as ExtractedDocumentData | null;
        if (docData?.invoiceNumber === extractedData.invoiceNumber) {
          flags.push({
            flag_type: "duplicate_invoice",
            severity: "warning",
            message: `Duplicate invoice number found: ${extractedData.invoiceNumber}`,
            details: {
              invoiceNumber: extractedData.invoiceNumber,
              duplicateDocumentId: doc.id,
              duplicateFileName: doc.file_name,
            },
          });
          break;
        }
      }
    }
  }

  // Check for suspicious amounts
  if (extractedData.totalAmount !== undefined && extractedData.totalAmount !== null) {
    // Flag unusually high amounts
    if (extractedData.totalAmount > 100000) {
      flags.push({
        flag_type: "suspicious_amount",
        severity: "warning",
        message: `Unusually high amount: ${extractedData.currency || "USD"} ${extractedData.totalAmount.toLocaleString()}`,
        details: {
          amount: extractedData.totalAmount,
          currency: extractedData.currency || "USD",
          reason: "Amount exceeds $100,000",
        },
      });
    }

    // Flag round numbers that might indicate estimates
    if (extractedData.totalAmount >= 1000 && extractedData.totalAmount % 1000 === 0) {
      flags.push({
        flag_type: "suspicious_amount",
        severity: "info",
        message: `Round number amount may be an estimate: ${extractedData.currency || "USD"} ${extractedData.totalAmount.toLocaleString()}`,
        details: {
          amount: extractedData.totalAmount,
          currency: extractedData.currency || "USD",
          reason: "Perfectly round number",
        },
      });
    }
  }

  // Check for missing critical data
  const missingFields: string[] = [];

  if (extractedData.documentType === "invoice") {
    if (!extractedData.invoiceNumber) missingFields.push("Invoice Number");
    if (!extractedData.vendorName) missingFields.push("Vendor Name");
    if (!extractedData.totalAmount) missingFields.push("Total Amount");
    if (!extractedData.dueDate) missingFields.push("Due Date");
  } else if (extractedData.documentType === "contract") {
    if (!extractedData.partyA) missingFields.push("Party A");
    if (!extractedData.partyB) missingFields.push("Party B");
    if (!extractedData.effectiveDate) missingFields.push("Effective Date");
  } else if (extractedData.documentType === "receipt") {
    if (!extractedData.merchantName) missingFields.push("Merchant Name");
    if (!extractedData.total && !extractedData.totalAmount) missingFields.push("Total Amount");
  }

  if (missingFields.length > 0) {
    flags.push({
      flag_type: "missing_data",
      severity: missingFields.length > 2 ? "warning" : "info",
      message: `Missing ${missingFields.length} required field(s): ${missingFields.join(", ")}`,
      details: {
        missingFields,
        documentType: extractedData.documentType,
      },
    });
  }

  // Check for expiring contracts
  if (extractedData.expirationDate) {
    const expirationDate = new Date(extractedData.expirationDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (expirationDate < today) {
      flags.push({
        flag_type: "past_due",
        severity: "critical",
        message: "Contract has expired",
        details: {
          expirationDate: extractedData.expirationDate,
        },
      });
    } else if (expirationDate < thirtyDaysFromNow) {
      const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      flags.push({
        flag_type: "other",
        severity: "warning",
        message: `Contract expires in ${daysUntilExpiration} days`,
        details: {
          expirationDate: extractedData.expirationDate,
          daysUntilExpiration,
        },
      });
    }
  }

  return flags;
}

export async function saveDocumentFlags(
  documentId: string,
  flags: DetectedFlag[]
): Promise<{ success: boolean; error?: string }> {
  if (flags.length === 0) {
    return { success: true };
  }

  const supabase = await createClient();

  // Insert all flags
  const { error } = await supabase.from("document_flags").insert(
    flags.map((flag) => ({
      document_id: documentId,
      flag_type: flag.flag_type,
      severity: flag.severity,
      message: flag.message,
      details: JSON.parse(JSON.stringify(flag.details)),
    }))
  );

  if (error) {
    console.error("Error saving document flags:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function resolveDocumentFlag(
  flagId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("document_flags")
    .update({
      resolved: true,
      resolved_by: user?.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", flagId);

  if (error) {
    console.error("Error resolving flag:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
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

export async function resolveAllDocumentFlags(
  documentId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get count of unresolved flags first
  const { count } = await supabase
    .from("document_flags")
    .select("*", { count: "exact", head: true })
    .eq("document_id", documentId)
    .eq("resolved", false);

  // Resolve all unresolved flags for this document
  const { error } = await supabase
    .from("document_flags")
    .update({
      resolved: true,
      resolved_by: user?.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("document_id", documentId)
    .eq("resolved", false);

  if (error) {
    console.error("Error resolving all flags:", error);
    return { success: false, count: 0, error: error.message };
  }

  return { success: true, count: count || 0 };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { findSimilarDocuments } from "./document-embeddings";
import { ExtractedDocumentData } from "@/lib/ocr/types";

/**
 * Duplicate Detection Service
 * Uses semantic similarity to find potential duplicate documents
 */

export interface DuplicateCandidate {
  documentId: string;
  fileName: string;
  documentType: string | null;
  similarity: number;
  matchReason: string[];
}

export interface DuplicateCheckResult {
  success: boolean;
  hasDuplicates: boolean;
  candidates?: DuplicateCandidate[];
  error?: string;
}

/**
 * Check for potential duplicates using semantic similarity
 */
export async function checkForDuplicates(
  documentId: string,
  threshold: number = 0.85
): Promise<DuplicateCheckResult> {
  const supabase = await createClient();

  // Get document details
  const { data: document, error: fetchError } = await supabase
    .from("documents")
    .select("id, file_name, document_type, extracted_data")
    .eq("id", documentId)
    .single();

  if (fetchError || !document) {
    return { success: false, hasDuplicates: false, error: "Document not found" };
  }

  const extractedData = document.extracted_data as ExtractedDocumentData | null;

  // Find semantically similar documents
  const similarResult = await findSimilarDocuments(documentId, 10, threshold);

  if (!similarResult.success) {
    // If embedding not available, fall back to field matching
    return checkForDuplicatesByFields(documentId, extractedData);
  }

  const candidates: DuplicateCandidate[] = [];

  for (const similar of similarResult.results || []) {
    const matchReasons: string[] = [];

    // High semantic similarity
    if (similar.similarity >= 0.95) {
      matchReasons.push(`Very high content similarity (${(similar.similarity * 100).toFixed(1)}%)`);
    } else if (similar.similarity >= 0.9) {
      matchReasons.push(`High content similarity (${(similar.similarity * 100).toFixed(1)}%)`);
    } else {
      matchReasons.push(`Similar content (${(similar.similarity * 100).toFixed(1)}%)`);
    }

    // Check for matching invoice number
    if (extractedData?.invoiceNumber) {
      const { data: otherDoc } = await supabase
        .from("documents")
        .select("extracted_data")
        .eq("id", similar.documentId)
        .single();

      const otherData = otherDoc?.extracted_data as ExtractedDocumentData | null;
      if (otherData?.invoiceNumber === extractedData.invoiceNumber) {
        matchReasons.push(`Same invoice number: ${extractedData.invoiceNumber}`);
      }
    }

    candidates.push({
      documentId: similar.documentId,
      fileName: similar.fileName,
      documentType: similar.documentType,
      similarity: similar.similarity,
      matchReason: matchReasons,
    });
  }

  return {
    success: true,
    hasDuplicates: candidates.length > 0,
    candidates,
  };
}

/**
 * Check for duplicates by matching specific fields
 * (Fallback when embeddings are not available)
 */
async function checkForDuplicatesByFields(
  documentId: string,
  extractedData: ExtractedDocumentData | null
): Promise<DuplicateCheckResult> {
  if (!extractedData) {
    return { success: true, hasDuplicates: false, candidates: [] };
  }

  const supabase = await createClient();
  const candidates: DuplicateCandidate[] = [];

  // Check for duplicate invoice number
  if (extractedData.invoiceNumber) {
    const { data: duplicates } = await supabase
      .from("documents")
      .select("id, file_name, document_type, extracted_data")
      .neq("id", documentId)
      .eq("document_type", "invoice")
      .is("deleted_at", null);

    if (duplicates) {
      for (const doc of duplicates) {
        const docData = doc.extracted_data as ExtractedDocumentData | null;
        if (docData?.invoiceNumber === extractedData.invoiceNumber) {
          const matchReasons = [`Same invoice number: ${extractedData.invoiceNumber}`];

          // Check vendor match
          if (docData?.vendorName && extractedData.vendorName &&
              docData.vendorName.toLowerCase() === extractedData.vendorName.toLowerCase()) {
            matchReasons.push(`Same vendor: ${extractedData.vendorName}`);
          }

          // Check amount match
          if (docData?.totalAmount && extractedData.totalAmount &&
              docData.totalAmount === extractedData.totalAmount) {
            matchReasons.push(`Same amount: ${extractedData.currency || "USD"} ${extractedData.totalAmount}`);
          }

          candidates.push({
            documentId: doc.id,
            fileName: doc.file_name,
            documentType: doc.document_type,
            similarity: 0.9, // High similarity for exact field match
            matchReason: matchReasons,
          });
        }
      }
    }
  }

  // Check for same check number
  if (extractedData.checkNumber) {
    const { data: duplicates } = await supabase
      .from("documents")
      .select("id, file_name, document_type, extracted_data")
      .neq("id", documentId)
      .eq("document_type", "check")
      .is("deleted_at", null);

    if (duplicates) {
      for (const doc of duplicates) {
        const docData = doc.extracted_data as ExtractedDocumentData | null;
        if (docData?.checkNumber === extractedData.checkNumber) {
          candidates.push({
            documentId: doc.id,
            fileName: doc.file_name,
            documentType: doc.document_type,
            similarity: 0.9,
            matchReason: [`Same check number: ${extractedData.checkNumber}`],
          });
        }
      }
    }
  }

  // Check for same PO number
  if (extractedData.poNumber) {
    const { data: duplicates } = await supabase
      .from("documents")
      .select("id, file_name, document_type, extracted_data")
      .neq("id", documentId)
      .eq("document_type", "purchase_order")
      .is("deleted_at", null);

    if (duplicates) {
      for (const doc of duplicates) {
        const docData = doc.extracted_data as ExtractedDocumentData | null;
        if (docData?.poNumber === extractedData.poNumber) {
          candidates.push({
            documentId: doc.id,
            fileName: doc.file_name,
            documentType: doc.document_type,
            similarity: 0.9,
            matchReason: [`Same PO number: ${extractedData.poNumber}`],
          });
        }
      }
    }
  }

  return {
    success: true,
    hasDuplicates: candidates.length > 0,
    candidates,
  };
}

/**
 * Get duplicate warning for document detail view
 */
export async function getDuplicateWarning(
  documentId: string
): Promise<{ hasDuplicates: boolean; message?: string; duplicateCount?: number }> {
  const result = await checkForDuplicates(documentId, 0.85);

  if (!result.success || !result.hasDuplicates) {
    return { hasDuplicates: false };
  }

  const highConfidenceDuplicates = result.candidates?.filter(c => c.similarity >= 0.9) || [];

  if (highConfidenceDuplicates.length > 0) {
    return {
      hasDuplicates: true,
      message: `This document may be a duplicate of ${highConfidenceDuplicates.length} other document(s)`,
      duplicateCount: highConfidenceDuplicates.length,
    };
  }

  return {
    hasDuplicates: true,
    message: `${result.candidates?.length || 0} similar document(s) found`,
    duplicateCount: result.candidates?.length || 0,
  };
}

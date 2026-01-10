"use server";

import { createClient } from "@/lib/supabase/server";
import { generateEmbedding, createContentHash, EMBEDDING_MODEL } from "./openai";
import { ExtractedDocumentData } from "@/lib/ocr/types";

/**
 * Document Embedding Service
 * Generates and stores embeddings for approved documents
 */

export interface EmbeddingGenerationResult {
  success: boolean;
  embeddingId?: string;
  error?: string;
}

/**
 * Generate searchable content from document data
 */
function generateSearchableContent(
  extractedData: ExtractedDocumentData,
  rawText?: string | null
): string {
  const parts: string[] = [];

  // Add document type
  if (extractedData.documentType) {
    parts.push(`Document Type: ${extractedData.documentType}`);
  }

  // Add key fields based on document type
  if (extractedData.invoiceNumber) {
    parts.push(`Invoice Number: ${extractedData.invoiceNumber}`);
  }
  if (extractedData.vendorName) {
    parts.push(`Vendor: ${extractedData.vendorName}`);
  }
  if (extractedData.merchantName) {
    parts.push(`Merchant: ${extractedData.merchantName}`);
  }
  if (extractedData.totalAmount) {
    parts.push(`Amount: ${extractedData.currency || "USD"} ${extractedData.totalAmount}`);
  }
  if (extractedData.partyA) {
    parts.push(`Party A: ${extractedData.partyA}`);
  }
  if (extractedData.partyB) {
    parts.push(`Party B: ${extractedData.partyB}`);
  }
  if (extractedData.employeeName) {
    parts.push(`Employee: ${extractedData.employeeName}`);
  }
  if (extractedData.employerName) {
    parts.push(`Employer: ${extractedData.employerName}`);
  }
  if (extractedData.recipientName) {
    parts.push(`Recipient: ${extractedData.recipientName}`);
  }
  if (extractedData.payerName) {
    parts.push(`Payer: ${extractedData.payerName}`);
  }
  if (extractedData.bankName) {
    parts.push(`Bank: ${extractedData.bankName}`);
  }
  if (extractedData.payee) {
    parts.push(`Payee: ${extractedData.payee}`);
  }

  // Add line items if present
  if (extractedData.lineItems && extractedData.lineItems.length > 0) {
    const itemDescriptions = extractedData.lineItems
      .map(item => item.description)
      .filter(Boolean)
      .join(", ");
    if (itemDescriptions) {
      parts.push(`Items: ${itemDescriptions}`);
    }
  }

  // Add raw text (truncated for embedding)
  if (rawText) {
    parts.push(rawText.slice(0, 10000));
  }

  return parts.join("\n");
}

/**
 * Generate and store embedding for a document
 */
export async function generateDocumentEmbedding(
  documentId: string
): Promise<EmbeddingGenerationResult> {
  const supabase = await createClient();

  // Fetch document data
  const { data: document, error: fetchError } = await supabase
    .from("documents")
    .select("id, organization_id, extracted_data, raw_text, status")
    .eq("id", documentId)
    .single();

  if (fetchError || !document) {
    return { success: false, error: "Document not found" };
  }

  // Only generate embeddings for approved documents
  if (document.status !== "completed") {
    return { success: false, error: "Document must be approved before generating embedding" };
  }

  const extractedData = document.extracted_data as ExtractedDocumentData | null;
  if (!extractedData) {
    return { success: false, error: "No extracted data available" };
  }

  // Generate searchable content
  const content = generateSearchableContent(extractedData, document.raw_text);
  const contentHash = createContentHash(content);

  // Check if embedding already exists with same content
  const { data: existingEmbedding } = await supabase
    .from("document_embeddings")
    .select("id, content_hash")
    .eq("document_id", documentId)
    .single();

  if (existingEmbedding?.content_hash === contentHash) {
    return { success: true, embeddingId: existingEmbedding.id };
  }

  // Generate new embedding
  const embeddingResult = await generateEmbedding(content);

  if (!embeddingResult.success || !embeddingResult.embedding) {
    return { success: false, error: embeddingResult.error || "Failed to generate embedding" };
  }

  // Format embedding for pgvector
  const embeddingString = `[${embeddingResult.embedding.join(",")}]`;

  // Upsert embedding
  if (existingEmbedding) {
    const { error: updateError } = await supabase
      .from("document_embeddings")
      .update({
        embedding: embeddingString,
        content_hash: contentHash,
        model: EMBEDDING_MODEL,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingEmbedding.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true, embeddingId: existingEmbedding.id };
  } else {
    const { data: newEmbedding, error: insertError } = await supabase
      .from("document_embeddings")
      .insert({
        document_id: documentId,
        organization_id: document.organization_id,
        embedding: embeddingString,
        content_hash: contentHash,
        model: EMBEDDING_MODEL,
      })
      .select("id")
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return { success: true, embeddingId: newEmbedding.id };
  }
}

/**
 * Semantic search for documents
 */
export async function searchDocumentsByContent(
  query: string,
  limit: number = 10,
  threshold: number = 0.7
): Promise<{
  success: boolean;
  results?: Array<{
    documentId: string;
    similarity: number;
    fileName: string;
    documentType: string | null;
  }>;
  error?: string;
}> {
  const supabase = await createClient();

  // Generate embedding for query
  const queryEmbeddingResult = await generateEmbedding(query);

  if (!queryEmbeddingResult.success || !queryEmbeddingResult.embedding) {
    return { success: false, error: queryEmbeddingResult.error || "Failed to generate query embedding" };
  }

  const queryEmbeddingString = `[${queryEmbeddingResult.embedding.join(",")}]`;

  // Use pgvector similarity search
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbeddingString,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) {
    // If the function doesn't exist yet, we'll create it
    if (error.message.includes("function") && error.message.includes("does not exist")) {
      return { success: false, error: "Semantic search function not yet created. Run migration." };
    }
    return { success: false, error: error.message };
  }

  return {
    success: true,
    results: data?.map((row: { document_id: string; similarity: number; file_name: string; document_type: string | null }) => ({
      documentId: row.document_id,
      similarity: row.similarity,
      fileName: row.file_name,
      documentType: row.document_type,
    })) || [],
  };
}

/**
 * Find similar documents to a given document
 */
export async function findSimilarDocuments(
  documentId: string,
  limit: number = 5,
  threshold: number = 0.85
): Promise<{
  success: boolean;
  results?: Array<{
    documentId: string;
    similarity: number;
    fileName: string;
    documentType: string | null;
  }>;
  error?: string;
}> {
  const supabase = await createClient();

  // Get the document's embedding
  const { data: embedding, error: fetchError } = await supabase
    .from("document_embeddings")
    .select("embedding")
    .eq("document_id", documentId)
    .single();

  if (fetchError || !embedding?.embedding) {
    return { success: false, error: "Document embedding not found" };
  }

  // Use pgvector similarity search
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding.embedding,
    match_threshold: threshold,
    match_count: limit + 1, // +1 to exclude the document itself
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Filter out the source document
  const filteredResults = data
    ?.filter((row: { document_id: string }) => row.document_id !== documentId)
    .slice(0, limit);

  return {
    success: true,
    results: filteredResults?.map((row: { document_id: string; similarity: number; file_name: string; document_type: string | null }) => ({
      documentId: row.document_id,
      similarity: row.similarity,
      fileName: row.file_name,
      documentType: row.document_type,
    })) || [],
  };
}

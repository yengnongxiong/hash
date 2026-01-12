"use server";

import { createClient } from "@/lib/supabase/server";
import { processDocumentOCR } from "@/app/(dashboard)/documents/actions";
import { generateDocumentEmbedding } from "@/lib/embeddings/document-embeddings";
import { learnEntitiesFromDocument, validateDocumentEntities } from "@/lib/embeddings/entity-service";

interface QueueItem {
  id: string;
  document_id: string;
  status: "pending" | "processing" | "completed" | "failed" | "dead_letter";
  priority: number;
  processor: "ocr" | "extraction" | "validation" | "embedding" | "entity_learning";
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  started_at: string | null;
  completed_at: string | null;
  next_retry_at: string | null;
  created_at: string;
  organization_id: string;
}

// Queue a document for processing
export async function queueDocument(
  documentId: string,
  processor: QueueItem["processor"] = "ocr",
  priority: number = 0
): Promise<{ success: boolean; queueId?: string; error?: string }> {
  const supabase = await createClient();

  // Get document to find org
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("organization_id")
    .eq("id", documentId)
    .single();

  if (docError || !doc) {
    return { success: false, error: "Document not found" };
  }

  // Insert into queue
  const { data, error } = await supabase
    .from("document_queue")
    .insert({
      document_id: documentId,
      processor,
      priority,
      organization_id: doc.organization_id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error queuing document:", error);
    return { success: false, error: error.message };
  }

  return { success: true, queueId: data.id };
}

// Process next item in queue
export async function processNextInQueue(): Promise<{
  success: boolean;
  processed: boolean;
  documentId?: string;
  error?: string;
}> {
  const supabase = await createClient();

  // Get and lock next pending item
  const { data: item, error: fetchError } = await supabase
    .from("document_queue")
    .select("*")
    .eq("status", "pending")
    .or("next_retry_at.is.null,next_retry_at.lte.now()")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      // No items in queue
      return { success: true, processed: false };
    }
    return { success: false, processed: false, error: fetchError.message };
  }

  if (!item) {
    return { success: true, processed: false };
  }

  // Use defaults for nullable fields
  const currentAttempts = item.attempts ?? 0;
  const maxAttempts = item.max_attempts ?? 3;

  // Update to processing
  const { error: updateError } = await supabase
    .from("document_queue")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
      attempts: currentAttempts + 1,
    })
    .eq("id", item.id)
    .eq("status", "pending"); // Optimistic lock

  if (updateError) {
    return { success: false, processed: false, error: updateError.message };
  }

  // Process based on processor type
  try {
    const startTime = Date.now();

    if (item.processor === "ocr" && item.document_id) {
      await processDocumentOCR(item.document_id);
    } else if (item.processor === "embedding" && item.document_id) {
      // Generate document embedding for semantic search
      const result = await generateDocumentEmbedding(item.document_id);
      if (!result.success) {
        throw new Error(result.error || "Failed to generate embedding");
      }
    } else if (item.processor === "entity_learning" && item.document_id) {
      // Fetch document's extracted_data
      const { data: doc } = await supabase
        .from("documents")
        .select("extracted_data")
        .eq("id", item.document_id)
        .single();

      if (doc?.extracted_data) {
        // Learn entities from the document
        const learnResult = await learnEntitiesFromDocument(
          item.document_id,
          doc.extracted_data as Record<string, unknown>
        );
        if (!learnResult.success) {
          throw new Error(learnResult.error || "Failed to learn entities");
        }

        // Also validate entities
        await validateDocumentEntities(
          item.document_id,
          doc.extracted_data as Record<string, unknown>
        );
      }
    }

    const duration = Date.now() - startTime;

    // Mark as completed
    await supabase
      .from("document_queue")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    // Save processing metrics
    await supabase.from("processing_metrics").insert({
      document_id: item.document_id,
      ocr_duration_ms: item.processor === "ocr" ? duration : null,
      total_duration_ms: duration,
    });

    return { success: true, processed: true, documentId: item.document_id ?? undefined };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Check if max retries exceeded
    if (currentAttempts + 1 >= maxAttempts) {
      // Move to dead letter queue
      await supabase
        .from("document_queue")
        .update({
          status: "dead_letter",
          last_error: errorMessage,
        })
        .eq("id", item.id);
    } else {
      // Calculate exponential backoff
      const backoffMinutes = Math.pow(2, currentAttempts + 1);
      const nextRetry = new Date(Date.now() + backoffMinutes * 60 * 1000);

      // Mark as pending for retry
      await supabase
        .from("document_queue")
        .update({
          status: "pending",
          last_error: errorMessage,
          next_retry_at: nextRetry.toISOString(),
        })
        .eq("id", item.id);
    }

    return { success: false, processed: false, documentId: item.document_id ?? undefined, error: errorMessage };
  }
}

// Get queue status for a document
export async function getDocumentQueueStatus(
  documentId: string
): Promise<QueueItem | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("document_queue")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return null;
  }

  return data as QueueItem;
}

// Get queue statistics
export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  failed: number;
  deadLetter: number;
  completed24h: number;
}> {
  const supabase = await createClient();

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Fetch all counts in parallel
  const [pending, processing, failed, deadLetter, completed24h] = await Promise.all([
    supabase.from("document_queue").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("document_queue").select("*", { count: "exact", head: true }).eq("status", "processing"),
    supabase.from("document_queue").select("*", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("document_queue").select("*", { count: "exact", head: true }).eq("status", "dead_letter"),
    supabase
      .from("document_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("completed_at", yesterday),
  ]);

  return {
    pending: pending.count || 0,
    processing: processing.count || 0,
    failed: failed.count || 0,
    deadLetter: deadLetter.count || 0,
    completed24h: completed24h.count || 0,
  };
}

// Retry failed items
export async function retryFailedItems(): Promise<{ success: boolean; count: number }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("document_queue")
    .update({
      status: "pending",
      attempts: 0,
      last_error: null,
      next_retry_at: null,
    })
    .eq("status", "failed")
    .select("id");

  if (error) {
    console.error("Error retrying failed items:", error);
    return { success: false, count: 0 };
  }

  return { success: true, count: data?.length || 0 };
}

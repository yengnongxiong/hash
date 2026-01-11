"use server";

import { createClient } from "@/lib/supabase/server";
import { getUnusedCorrections, markCorrectionsUsed } from "./correction-service";
import { ModelType, registerModelVersion } from "./model-versioning";
import { Json } from "@/types/database";
import {
  uploadTrainingFile,
  createFineTuningJob,
  getJobStatus,
  type TogetherFineTuneJob,
} from "./together-finetune";

export interface TrainingExample {
  documentId: string;
  documentType: string;
  rawText: string;
  originalExtraction: Record<string, unknown>;
  correctedExtraction: Record<string, unknown>;
  corrections: Array<{
    fieldName: string;
    originalValue: unknown;
    correctedValue: unknown;
  }>;
}

export interface TrainingBatch {
  id: string;
  modelType: ModelType;
  examples: TrainingExample[];
  validationExamples: TrainingExample[];
  createdAt: string;
}

export interface TrainingDataExport {
  format: "jsonl" | "alpaca" | "openai";
  trainingData: string;
  validationData: string;
  stats: {
    totalExamples: number;
    trainingCount: number;
    validationCount: number;
    fieldsCovered: string[];
    documentTypesCovered: string[];
  };
}

/**
 * Create a training batch from unused corrections
 */
export async function createTrainingBatch(
  modelType: ModelType,
  validationSplit: number = 0.1
): Promise<{ success: boolean; batch?: TrainingBatch; error?: string }> {
  const supabase = await createClient();

  // Get unused corrections
  const correctionsResult = await getUnusedCorrections(5000);

  if (!correctionsResult.success || !correctionsResult.corrections) {
    return { success: false, error: correctionsResult.error || "No corrections found" };
  }

  if (correctionsResult.corrections.length === 0) {
    return { success: false, error: "No unused corrections available" };
  }

  // Group corrections by document
  const correctionsByDoc = new Map<string, typeof correctionsResult.corrections>();

  for (const correction of correctionsResult.corrections) {
    const existing = correctionsByDoc.get(correction.documentId) || [];
    existing.push(correction);
    correctionsByDoc.set(correction.documentId, existing);
  }

  // Fetch document data for each document
  const documentIds = Array.from(correctionsByDoc.keys());

  const { data: documents, error: docsError } = await supabase
    .from("documents")
    .select("id, document_type, raw_text, extracted_data")
    .in("id", documentIds);

  if (docsError || !documents) {
    return { success: false, error: docsError?.message || "Failed to fetch documents" };
  }

  // Build training examples
  const examples: TrainingExample[] = [];

  for (const doc of documents) {
    const docCorrections = correctionsByDoc.get(doc.id) || [];
    if (docCorrections.length === 0) continue;

    const originalExtraction = (doc.extracted_data || {}) as Record<string, unknown>;

    // Apply corrections to get corrected extraction
    const correctedExtraction = { ...originalExtraction };
    for (const correction of docCorrections) {
      correctedExtraction[correction.fieldName] = correction.correctedValue;
    }

    examples.push({
      documentId: doc.id,
      documentType: doc.document_type || "unknown",
      rawText: doc.raw_text || "",
      originalExtraction,
      correctedExtraction,
      corrections: docCorrections.map(c => ({
        fieldName: c.fieldName,
        originalValue: c.originalValue,
        correctedValue: c.correctedValue,
      })),
    });
  }

  if (examples.length === 0) {
    return { success: false, error: "No valid training examples could be created" };
  }

  // Shuffle and split into training/validation
  const shuffled = [...examples].sort(() => Math.random() - 0.5);
  const validationCount = Math.max(1, Math.floor(shuffled.length * validationSplit));
  const trainingExamples = shuffled.slice(validationCount);
  const validationExamples = shuffled.slice(0, validationCount);

  // Create training batch record
  const { data: batchData, error: batchError } = await supabase
    .from("training_batches")
    .insert({
      model_type: modelType,
      status: "pending",
      training_examples_count: trainingExamples.length,
      validation_examples_count: validationExamples.length,
    })
    .select("id, created_at")
    .single();

  if (batchError || !batchData) {
    return { success: false, error: batchError?.message || "Failed to create batch" };
  }

  // Mark corrections as used
  const allCorrectionIds = correctionsResult.corrections.map(c => c.id);
  await markCorrectionsUsed(allCorrectionIds, batchData.id);

  return {
    success: true,
    batch: {
      id: batchData.id,
      modelType,
      examples: trainingExamples,
      validationExamples,
      createdAt: batchData.created_at || new Date().toISOString(),
    },
  };
}

/**
 * Export training data in various formats for fine-tuning
 */
export async function exportTrainingData(
  batch: TrainingBatch,
  format: "jsonl" | "alpaca" | "openai" = "jsonl"
): Promise<TrainingDataExport> {
  const fieldsCovered = new Set<string>();
  const documentTypesCovered = new Set<string>();

  for (const example of [...batch.examples, ...batch.validationExamples]) {
    documentTypesCovered.add(example.documentType);
    for (const correction of example.corrections) {
      fieldsCovered.add(correction.fieldName);
    }
  }

  let trainingData: string;
  let validationData: string;

  switch (format) {
    case "openai":
      trainingData = exportOpenAIFormat(batch.examples);
      validationData = exportOpenAIFormat(batch.validationExamples);
      break;
    case "alpaca":
      trainingData = exportAlpacaFormat(batch.examples);
      validationData = exportAlpacaFormat(batch.validationExamples);
      break;
    case "jsonl":
    default:
      trainingData = exportJSONLFormat(batch.examples);
      validationData = exportJSONLFormat(batch.validationExamples);
  }

  return {
    format,
    trainingData,
    validationData,
    stats: {
      totalExamples: batch.examples.length + batch.validationExamples.length,
      trainingCount: batch.examples.length,
      validationCount: batch.validationExamples.length,
      fieldsCovered: Array.from(fieldsCovered),
      documentTypesCovered: Array.from(documentTypesCovered),
    },
  };
}

function exportJSONLFormat(examples: TrainingExample[]): string {
  return examples.map(example => JSON.stringify({
    input: {
      document_type: example.documentType,
      raw_text: example.rawText,
    },
    output: example.correctedExtraction,
    corrections: example.corrections,
  })).join("\n");
}

function exportOpenAIFormat(examples: TrainingExample[]): string {
  return examples.map(example => JSON.stringify({
    messages: [
      {
        role: "system",
        content: `You are a document extraction AI. Extract structured data from ${example.documentType} documents.`
      },
      {
        role: "user",
        content: `Extract data from this document:\n\n${example.rawText}`
      },
      {
        role: "assistant",
        content: JSON.stringify(example.correctedExtraction, null, 2)
      }
    ]
  })).join("\n");
}

function exportAlpacaFormat(examples: TrainingExample[]): string {
  return examples.map(example => JSON.stringify({
    instruction: `Extract structured data from this ${example.documentType} document.`,
    input: example.rawText,
    output: JSON.stringify(example.correctedExtraction, null, 2)
  })).join("\n");
}

/**
 * Get training batch by ID
 */
export async function getTrainingBatch(
  batchId: string
): Promise<{
  success: boolean;
  batch?: {
    id: string;
    modelType: string;
    status: string;
    trainingCount: number;
    validationCount: number;
    createdAt: string;
    completedAt: string | null;
    metrics: Record<string, unknown> | null;
    errorMessage: string | null;
  };
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("training_batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    batch: {
      id: data.id,
      modelType: data.model_type,
      status: data.status || "pending",
      trainingCount: data.training_examples_count || 0,
      validationCount: data.validation_examples_count || 0,
      createdAt: data.created_at || "",
      completedAt: data.completed_at,
      metrics: data.metrics as Record<string, unknown> | null,
      errorMessage: data.error_message,
    },
  };
}

/**
 * Update training batch status
 */
export async function updateTrainingBatchStatus(
  batchId: string,
  status: "pending" | "processing" | "completed" | "failed",
  resultModelId?: string,
  metrics?: Record<string, unknown>,
  errorMessage?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = { status };

  if (status === "processing") {
    updateData.started_at = new Date().toISOString();
  }

  if (status === "completed" || status === "failed") {
    updateData.completed_at = new Date().toISOString();
  }

  if (resultModelId) {
    updateData.result_model_id = resultModelId;
  }

  if (metrics) {
    updateData.metrics = metrics as Json;
  }

  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  const { error } = await supabase
    .from("training_batches")
    .update(updateData)
    .eq("id", batchId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get recent training batches
 */
export async function getRecentTrainingBatches(
  limit: number = 10
): Promise<{
  success: boolean;
  batches?: Array<{
    id: string;
    modelType: string;
    status: string;
    trainingCount: number;
    validationCount: number;
    createdAt: string;
    completedAt: string | null;
  }>;
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("training_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    batches: data?.map(b => ({
      id: b.id,
      modelType: b.model_type,
      status: b.status || "pending",
      trainingCount: b.training_examples_count || 0,
      validationCount: b.validation_examples_count || 0,
      createdAt: b.created_at || "",
      completedAt: b.completed_at,
    })),
  };
}

/**
 * Start a fine-tuning job on Together.ai for a training batch
 *
 * This function:
 * 1. Rebuilds training examples from corrections
 * 2. Exports in OpenAI chat format (required for Together.ai)
 * 3. Uploads training file to Together.ai
 * 4. Creates a fine-tuning job
 * 5. Updates the batch with job IDs for tracking
 */
export async function startFineTuningJob(
  batchId: string,
  options?: {
    baseModel?: string;
    nEpochs?: number;
    learningRate?: number;
    batchSize?: number;
  }
): Promise<{
  success: boolean;
  jobId?: string;
  job?: TogetherFineTuneJob;
  error?: string;
}> {
  const supabase = await createClient();

  // Get the batch
  const { data: batch, error: batchError } = await supabase
    .from("training_batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    return { success: false, error: batchError?.message || "Batch not found" };
  }

  if (batch.status !== "pending") {
    return { success: false, error: `Batch is already ${batch.status}` };
  }

  // Get corrections associated with this batch
  const { data: corrections, error: correctionsError } = await supabase
    .from("field_corrections")
    .select("document_id, field_name, original_value, corrected_value")
    .eq("training_batch_id", batchId);

  if (correctionsError || !corrections || corrections.length === 0) {
    return { success: false, error: "No corrections found for this batch" };
  }

  // Group corrections by document
  const correctionsByDoc = new Map<string, typeof corrections>();
  for (const correction of corrections) {
    const existing = correctionsByDoc.get(correction.document_id) || [];
    existing.push(correction);
    correctionsByDoc.set(correction.document_id, existing);
  }

  // Fetch document data
  const documentIds = Array.from(correctionsByDoc.keys());
  const { data: documents, error: docsError } = await supabase
    .from("documents")
    .select("id, document_type, raw_text, extracted_data")
    .in("id", documentIds);

  if (docsError || !documents || documents.length === 0) {
    return { success: false, error: "Failed to fetch documents for training" };
  }

  // Build training data in OpenAI chat format
  const trainingLines: string[] = [];

  for (const doc of documents) {
    const docCorrections = correctionsByDoc.get(doc.id) || [];
    if (docCorrections.length === 0) continue;

    const originalExtraction = (doc.extracted_data || {}) as Record<string, unknown>;
    const correctedExtraction = { ...originalExtraction };

    for (const correction of docCorrections) {
      correctedExtraction[correction.field_name] = correction.corrected_value;
    }

    const example = {
      messages: [
        {
          role: "system",
          content: `You are a document extraction AI. Extract structured data from ${doc.document_type || "document"} documents. Return the extracted data as a valid JSON object.`,
        },
        {
          role: "user",
          content: `Extract structured data from this document:\n\n${doc.raw_text || ""}`,
        },
        {
          role: "assistant",
          content: JSON.stringify(correctedExtraction),
        },
      ],
    };

    trainingLines.push(JSON.stringify(example));
  }

  if (trainingLines.length === 0) {
    return { success: false, error: "No valid training examples" };
  }

  const trainingData = trainingLines.join("\n");

  // Update batch status to processing
  await supabase
    .from("training_batches")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
    })
    .eq("id", batchId);

  // Upload training file to Together.ai
  const uploadResult = await uploadTrainingFile(
    trainingData,
    `training_batch_${batchId}.jsonl`
  );

  if (!uploadResult.success || !uploadResult.fileId) {
    await supabase
      .from("training_batches")
      .update({
        status: "failed",
        error_message: uploadResult.error || "File upload failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", batchId);
    return { success: false, error: uploadResult.error || "File upload failed" };
  }

  // Store the file ID (column added via migration, not in generated types)
  await supabase
    .from("training_batches")
    .update({ together_file_id: uploadResult.fileId } as never)
    .eq("id", batchId);

  // Create fine-tuning job
  const outputName = `hash-extraction-${batch.model_type}-${Date.now()}`;
  const jobResult = await createFineTuningJob({
    trainingFile: uploadResult.fileId,
    outputName,
    nEpochs: options?.nEpochs,
    learningRate: options?.learningRate,
    batchSize: options?.batchSize,
    baseModel: options?.baseModel,
  });

  if (!jobResult.success || !jobResult.jobId) {
    await supabase
      .from("training_batches")
      .update({
        status: "failed",
        error_message: jobResult.error || "Job creation failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", batchId);
    return { success: false, error: jobResult.error || "Job creation failed" };
  }

  // Store the job ID (columns added via migration, not in generated types)
  await supabase
    .from("training_batches")
    .update({
      together_job_id: jobResult.jobId,
      together_output_model: outputName,
    } as never)
    .eq("id", batchId);

  return {
    success: true,
    jobId: jobResult.jobId,
    job: jobResult.job,
  };
}

/**
 * Check and update status of a Together.ai fine-tuning job
 */
export async function checkFineTuningJobStatus(
  batchId: string
): Promise<{
  success: boolean;
  status?: string;
  modelId?: string;
  error?: string;
}> {
  const supabase = await createClient();

  // Get the batch with Together job ID (columns added via migration)
  const { data: batch, error: batchError } = await supabase
    .from("training_batches")
    .select("*")
    .eq("id", batchId)
    .single() as {
      data: {
        together_job_id: string | null;
        together_output_model: string | null;
        model_type: string;
        status: string | null;
      } | null;
      error: Error | null;
    };

  if (batchError || !batch) {
    return { success: false, error: "Batch not found" };
  }

  if (!batch.together_job_id) {
    return { success: false, error: "No Together.ai job associated with this batch" };
  }

  // Already completed or failed
  if (batch.status === "completed" || batch.status === "failed") {
    return { success: true, status: batch.status };
  }

  // Get job status from Together.ai
  const jobResult = await getJobStatus(batch.together_job_id);

  if (!jobResult.success || !jobResult.job) {
    return { success: false, error: jobResult.error || "Failed to get job status" };
  }

  const job = jobResult.job;

  // Update batch based on job status
  if (job.status === "completed") {
    // Register the new model version
    const modelVersion = await registerModelVersion({
      modelType: batch.model_type as ModelType,
      version: `v${Date.now()}`,
      provider: "together",
      modelId: batch.together_output_model || job.output_name,
      metadata: {
        trainedTokens: job.trained_tokens,
        trainingSteps: job.training_steps,
        togetherJobId: job.id,
      },
    });

    await supabase
      .from("training_batches")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        result_model_id: modelVersion.success ? modelVersion.modelVersionId : null,
        metrics: {
          trained_tokens: job.trained_tokens,
          training_steps: job.training_steps,
        } as Json,
      })
      .eq("id", batchId);

    return {
      success: true,
      status: "completed",
      modelId: modelVersion.modelVersionId,
    };
  } else if (job.status === "failed" || job.status === "cancelled") {
    await supabase
      .from("training_batches")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: `Together.ai job ${job.status}`,
      })
      .eq("id", batchId);

    return { success: true, status: job.status };
  }

  // Still running
  return { success: true, status: job.status };
}

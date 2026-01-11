"use server";

/**
 * Together.ai Fine-Tuning API Client
 *
 * Handles fine-tuning job creation, monitoring, and management.
 * Docs: https://docs.together.ai/docs/fine-tuning-api
 */

const TOGETHER_API_URL = "https://api.together.xyz/v1";
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;

// Default base model for fine-tuning
const DEFAULT_BASE_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo";

export type JobStatus =
  | "pending"
  | "queued"
  | "running"
  | "uploading"
  | "completed"
  | "failed"
  | "cancelled";

export interface TogetherFile {
  id: string;
  object: "file";
  filename: string;
  bytes: number;
  purpose: string;
  created_at: number;
}

export interface TogetherFineTuneJob {
  id: string;
  object: "fine-tune";
  model: string;
  output_name: string;
  status: JobStatus;
  created_at: number;
  updated_at: number;
  training_file: string;
  validation_file?: string;
  hyperparameters?: {
    n_epochs?: number;
    learning_rate?: number;
    batch_size?: number;
  };
  trained_tokens?: number;
  training_steps?: number;
  events?: TogetherFineTuneEvent[];
  result_files?: string[];
}

export interface TogetherFineTuneEvent {
  object: "fine-tune-event";
  created_at: number;
  level: "info" | "warning" | "error";
  message: string;
}

export interface FineTuneCreateParams {
  trainingFile: string; // File ID
  validationFile?: string; // Optional validation file ID
  baseModel?: string;
  outputName?: string;
  nEpochs?: number;
  learningRate?: number;
  batchSize?: number;
}

/**
 * Check if Together.ai API key is configured
 */
export async function isTogetherConfigured(): Promise<boolean> {
  return !!TOGETHER_API_KEY;
}

/**
 * Upload a training file to Together.ai
 */
export async function uploadTrainingFile(
  data: string,
  filename?: string
): Promise<{
  success: boolean;
  fileId?: string;
  file?: TogetherFile;
  error?: string;
}> {
  if (!TOGETHER_API_KEY) {
    return { success: false, error: "Together.ai API key not configured" };
  }

  try {
    // Create a FormData with the file
    const formData = new FormData();
    const blob = new Blob([data], { type: "application/jsonl" });
    formData.append("file", blob, filename || `training_${Date.now()}.jsonl`);
    formData.append("purpose", "fine-tune");

    const response = await fetch(`${TOGETHER_API_URL}/files`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOGETHER_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `Upload failed: ${response.statusText}`,
      };
    }

    const file = await response.json() as TogetherFile;
    return { success: true, fileId: file.id, file };
  } catch (error) {
    console.error("Together.ai file upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "File upload failed",
    };
  }
}

/**
 * Create a fine-tuning job
 */
export async function createFineTuningJob(
  params: FineTuneCreateParams
): Promise<{
  success: boolean;
  jobId?: string;
  job?: TogetherFineTuneJob;
  error?: string;
}> {
  if (!TOGETHER_API_KEY) {
    return { success: false, error: "Together.ai API key not configured" };
  }

  try {
    const requestBody: Record<string, unknown> = {
      training_file: params.trainingFile,
      model: params.baseModel || DEFAULT_BASE_MODEL,
    };

    if (params.validationFile) {
      requestBody.validation_file = params.validationFile;
    }

    if (params.outputName) {
      requestBody.output_name = params.outputName;
    }

    // Hyperparameters
    const hyperparameters: Record<string, unknown> = {};
    if (params.nEpochs !== undefined) {
      hyperparameters.n_epochs = params.nEpochs;
    }
    if (params.learningRate !== undefined) {
      hyperparameters.learning_rate = params.learningRate;
    }
    if (params.batchSize !== undefined) {
      hyperparameters.batch_size = params.batchSize;
    }
    if (Object.keys(hyperparameters).length > 0) {
      requestBody.hyperparameters = hyperparameters;
    }

    const response = await fetch(`${TOGETHER_API_URL}/fine-tunes`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `Job creation failed: ${response.statusText}`,
      };
    }

    const job = await response.json() as TogetherFineTuneJob;
    return { success: true, jobId: job.id, job };
  } catch (error) {
    console.error("Together.ai job creation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Job creation failed",
    };
  }
}

/**
 * Get fine-tuning job status
 */
export async function getJobStatus(
  jobId: string
): Promise<{
  success: boolean;
  job?: TogetherFineTuneJob;
  error?: string;
}> {
  if (!TOGETHER_API_KEY) {
    return { success: false, error: "Together.ai API key not configured" };
  }

  try {
    const response = await fetch(`${TOGETHER_API_URL}/fine-tunes/${jobId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${TOGETHER_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `Status check failed: ${response.statusText}`,
      };
    }

    const job = await response.json() as TogetherFineTuneJob;
    return { success: true, job };
  } catch (error) {
    console.error("Together.ai status check error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Status check failed",
    };
  }
}

/**
 * List fine-tuning job events
 */
export async function listJobEvents(
  jobId: string
): Promise<{
  success: boolean;
  events?: TogetherFineTuneEvent[];
  error?: string;
}> {
  if (!TOGETHER_API_KEY) {
    return { success: false, error: "Together.ai API key not configured" };
  }

  try {
    const response = await fetch(`${TOGETHER_API_URL}/fine-tunes/${jobId}/events`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${TOGETHER_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `Events fetch failed: ${response.statusText}`,
      };
    }

    const data = await response.json() as { data: TogetherFineTuneEvent[] };
    return { success: true, events: data.data };
  } catch (error) {
    console.error("Together.ai events fetch error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Events fetch failed",
    };
  }
}

/**
 * Cancel a fine-tuning job
 */
export async function cancelJob(
  jobId: string
): Promise<{
  success: boolean;
  job?: TogetherFineTuneJob;
  error?: string;
}> {
  if (!TOGETHER_API_KEY) {
    return { success: false, error: "Together.ai API key not configured" };
  }

  try {
    const response = await fetch(`${TOGETHER_API_URL}/fine-tunes/${jobId}/cancel`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOGETHER_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `Cancel failed: ${response.statusText}`,
      };
    }

    const job = await response.json() as TogetherFineTuneJob;
    return { success: true, job };
  } catch (error) {
    console.error("Together.ai cancel error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Cancel failed",
    };
  }
}

/**
 * List all fine-tuning jobs
 */
export async function listJobs(): Promise<{
  success: boolean;
  jobs?: TogetherFineTuneJob[];
  error?: string;
}> {
  if (!TOGETHER_API_KEY) {
    return { success: false, error: "Together.ai API key not configured" };
  }

  try {
    const response = await fetch(`${TOGETHER_API_URL}/fine-tunes`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${TOGETHER_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `List failed: ${response.statusText}`,
      };
    }

    const data = await response.json() as { data: TogetherFineTuneJob[] };
    return { success: true, jobs: data.data };
  } catch (error) {
    console.error("Together.ai list jobs error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "List failed",
    };
  }
}

/**
 * Delete a training file
 */
export async function deleteFile(
  fileId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!TOGETHER_API_KEY) {
    return { success: false, error: "Together.ai API key not configured" };
  }

  try {
    const response = await fetch(`${TOGETHER_API_URL}/files/${fileId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${TOGETHER_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `Delete failed: ${response.statusText}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Together.ai delete file error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}

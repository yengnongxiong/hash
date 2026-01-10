"use server";

import { createClient } from "@/lib/supabase/server";
import { ModelType, ModelVersion, getActiveModelVersion } from "./model-versioning";

export type ExperimentStatus = "draft" | "running" | "paused" | "completed" | "cancelled";
export type SuccessMetric = "accuracy" | "confidence" | "correction_rate";

export interface ExperimentInput {
  name: string;
  description?: string;
  modelType: ModelType;
  controlModelId: string;
  treatmentModelId: string;
  trafficPercentage?: number;
  successMetric?: SuccessMetric;
  minimumSampleSize?: number;
}

export interface Experiment {
  id: string;
  name: string;
  description: string | null;
  modelType: ModelType;
  controlModelId: string;
  treatmentModelId: string;
  trafficPercentage: number;
  status: ExperimentStatus;
  startDate: string | null;
  endDate: string | null;
  successMetric: SuccessMetric;
  minimumSampleSize: number;
  createdAt: string;
}

export interface ExperimentResult {
  experimentId: string;
  controlStats: {
    sampleCount: number;
    averageConfidence: number;
    correctionRate: number;
    correctionCount: number;
  };
  treatmentStats: {
    sampleCount: number;
    averageConfidence: number;
    correctionRate: number;
    correctionCount: number;
  };
  winner: "control" | "treatment" | "inconclusive";
  confidence: number;
}

/**
 * Create a new A/B test experiment
 */
export async function createExperiment(
  input: ExperimentInput
): Promise<{ success: boolean; experimentId?: string; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("model_experiments")
    .insert({
      name: input.name,
      description: input.description,
      model_type: input.modelType,
      control_model_id: input.controlModelId,
      treatment_model_id: input.treatmentModelId,
      traffic_percentage: input.trafficPercentage || 50,
      status: "draft",
      success_metric: input.successMetric || "accuracy",
      minimum_sample_size: input.minimumSampleSize || 100,
      created_by: user?.id,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, experimentId: data.id };
}

/**
 * Start an experiment
 */
export async function startExperiment(
  experimentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("model_experiments")
    .update({
      status: "running",
      start_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", experimentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Pause an experiment
 */
export async function pauseExperiment(
  experimentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("model_experiments")
    .update({
      status: "paused",
      updated_at: new Date().toISOString(),
    })
    .eq("id", experimentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Complete an experiment
 */
export async function completeExperiment(
  experimentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("model_experiments")
    .update({
      status: "completed",
      end_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", experimentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Cancel an experiment
 */
export async function cancelExperiment(
  experimentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("model_experiments")
    .update({
      status: "cancelled",
      end_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", experimentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get all experiments
 */
export async function getExperiments(
  modelType?: ModelType,
  status?: ExperimentStatus
): Promise<{ success: boolean; experiments?: Experiment[]; error?: string }> {
  const supabase = await createClient();

  let query = supabase
    .from("model_experiments")
    .select("*")
    .order("created_at", { ascending: false });

  if (modelType) {
    query = query.eq("model_type", modelType);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    experiments: data?.map(e => ({
      id: e.id,
      name: e.name,
      description: e.description,
      modelType: e.model_type as ModelType,
      controlModelId: e.control_model_id,
      treatmentModelId: e.treatment_model_id,
      trafficPercentage: e.traffic_percentage || 50,
      status: e.status as ExperimentStatus || "draft",
      startDate: e.start_date,
      endDate: e.end_date,
      successMetric: e.success_metric as SuccessMetric || "accuracy",
      minimumSampleSize: e.minimum_sample_size || 100,
      createdAt: e.created_at || "",
    })),
  };
}

/**
 * Get the currently running experiment for a model type
 */
export async function getRunningExperiment(
  modelType: ModelType
): Promise<{ success: boolean; experiment?: Experiment; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("model_experiments")
    .select("*")
    .eq("model_type", modelType)
    .eq("status", "running")
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No running experiment
      return { success: true };
    }
    return { success: false, error: error.message };
  }

  return {
    success: true,
    experiment: {
      id: data.id,
      name: data.name,
      description: data.description,
      modelType: data.model_type as ModelType,
      controlModelId: data.control_model_id,
      treatmentModelId: data.treatment_model_id,
      trafficPercentage: data.traffic_percentage || 50,
      status: data.status as ExperimentStatus || "draft",
      startDate: data.start_date,
      endDate: data.end_date,
      successMetric: data.success_metric as SuccessMetric || "accuracy",
      minimumSampleSize: data.minimum_sample_size || 100,
      createdAt: data.created_at || "",
    },
  };
}

/**
 * Select which model to use for a document (for A/B testing)
 * Returns the model version to use based on traffic allocation
 */
export async function selectModelForDocument(
  modelType: ModelType
): Promise<{
  success: boolean;
  modelVersion?: ModelVersion;
  experimentId?: string;
  isControl?: boolean;
  error?: string;
}> {
  // Check for running experiment
  const experimentResult = await getRunningExperiment(modelType);

  if (!experimentResult.success) {
    return { success: false, error: experimentResult.error };
  }

  if (!experimentResult.experiment) {
    // No experiment running, use default active model
    const activeModel = await getActiveModelVersion(modelType);
    return {
      success: activeModel.success,
      modelVersion: activeModel.version,
      error: activeModel.error,
    };
  }

  const experiment = experimentResult.experiment;

  // Randomly select control or treatment based on traffic percentage
  const randomValue = Math.random() * 100;
  const isControl = randomValue >= experiment.trafficPercentage;

  // Get the appropriate model
  const supabase = await createClient();
  const modelId = isControl ? experiment.controlModelId : experiment.treatmentModelId;

  const { data: model, error } = await supabase
    .from("model_versions")
    .select("*")
    .eq("id", modelId)
    .single();

  if (error || !model) {
    return { success: false, error: "Failed to get model version" };
  }

  return {
    success: true,
    modelVersion: {
      id: model.id,
      modelType: model.model_type as ModelType,
      version: model.version,
      provider: model.provider as "together" | "replicate" | "openai" | "mistral",
      modelId: model.model_id,
      baseModel: model.base_model,
      trainingDataCount: model.training_data_count || 0,
      accuracyScore: model.accuracy_score,
      isActive: model.is_active || false,
      isDefault: model.is_default || false,
      createdAt: model.created_at || "",
      activatedAt: model.activated_at,
      deactivatedAt: model.deactivated_at,
      metadata: model.metadata as Record<string, unknown> | null,
    },
    experimentId: experiment.id,
    isControl,
  };
}

/**
 * Record a document's experiment result
 */
export async function recordExperimentResult(
  experimentId: string,
  documentId: string,
  modelVersionId: string,
  isControl: boolean,
  confidenceScore: number,
  processingTimeMs?: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("experiment_results")
    .insert({
      experiment_id: experimentId,
      document_id: documentId,
      model_version_id: modelVersionId,
      is_control: isControl,
      confidence_score: confidenceScore,
      was_corrected: false,
      correction_count: 0,
      processing_time_ms: processingTimeMs,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Mark that a document was corrected (for experiment tracking)
 */
export async function recordExperimentCorrection(
  documentId: string,
  correctionCount: number = 1
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Find the experiment result for this document
  const { data: result, error: fetchError } = await supabase
    .from("experiment_results")
    .select("id, correction_count")
    .eq("document_id", documentId)
    .single();

  if (fetchError || !result) {
    // No experiment result for this document, that's ok
    return { success: true };
  }

  const { error } = await supabase
    .from("experiment_results")
    .update({
      was_corrected: true,
      correction_count: (result.correction_count || 0) + correctionCount,
    })
    .eq("id", result.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get experiment results and statistics
 */
export async function getExperimentResults(
  experimentId: string
): Promise<{ success: boolean; result?: ExperimentResult; error?: string }> {
  const supabase = await createClient();

  const { data: results, error } = await supabase
    .from("experiment_results")
    .select("*")
    .eq("experiment_id", experimentId);

  if (error) {
    return { success: false, error: error.message };
  }

  if (!results || results.length === 0) {
    return {
      success: true,
      result: {
        experimentId,
        controlStats: { sampleCount: 0, averageConfidence: 0, correctionRate: 0, correctionCount: 0 },
        treatmentStats: { sampleCount: 0, averageConfidence: 0, correctionRate: 0, correctionCount: 0 },
        winner: "inconclusive",
        confidence: 0,
      },
    };
  }

  // Calculate statistics
  const controlResults = results.filter(r => r.is_control);
  const treatmentResults = results.filter(r => !r.is_control);

  const controlStats = calculateStats(controlResults);
  const treatmentStats = calculateStats(treatmentResults);

  // Determine winner based on correction rate (lower is better)
  let winner: "control" | "treatment" | "inconclusive" = "inconclusive";
  let confidence = 0;

  if (controlStats.sampleCount >= 30 && treatmentStats.sampleCount >= 30) {
    // Simple comparison - treatment is better if it has lower correction rate
    if (treatmentStats.correctionRate < controlStats.correctionRate) {
      winner = "treatment";
      confidence = Math.min(95, 50 + Math.abs(controlStats.correctionRate - treatmentStats.correctionRate) * 100);
    } else if (controlStats.correctionRate < treatmentStats.correctionRate) {
      winner = "control";
      confidence = Math.min(95, 50 + Math.abs(controlStats.correctionRate - treatmentStats.correctionRate) * 100);
    }
  }

  return {
    success: true,
    result: {
      experimentId,
      controlStats,
      treatmentStats,
      winner,
      confidence,
    },
  };
}

function calculateStats(results: Array<{
  confidence_score: number | null;
  was_corrected: boolean | null;
  correction_count: number | null;
}>): {
  sampleCount: number;
  averageConfidence: number;
  correctionRate: number;
  correctionCount: number;
} {
  if (results.length === 0) {
    return { sampleCount: 0, averageConfidence: 0, correctionRate: 0, correctionCount: 0 };
  }

  const totalConfidence = results.reduce((sum, r) => sum + (r.confidence_score || 0), 0);
  const correctedCount = results.filter(r => r.was_corrected).length;
  const totalCorrections = results.reduce((sum, r) => sum + (r.correction_count || 0), 0);

  return {
    sampleCount: results.length,
    averageConfidence: totalConfidence / results.length,
    correctionRate: correctedCount / results.length,
    correctionCount: totalCorrections,
  };
}

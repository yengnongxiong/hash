"use server";

import { createClient } from "@/lib/supabase/server";
import { Json } from "@/types/database";

export type ModelType = "classification" | "extraction";
export type ModelProvider = "together" | "replicate" | "openai" | "mistral";

export interface ModelVersionInput {
  modelType: ModelType;
  version: string;
  provider: ModelProvider;
  modelId: string;
  baseModel?: string;
  trainingDataCount?: number;
  accuracyScore?: number;
  metadata?: Record<string, unknown>;
}

export interface ModelVersion {
  id: string;
  modelType: ModelType;
  version: string;
  provider: ModelProvider;
  modelId: string;
  baseModel: string | null;
  trainingDataCount: number;
  accuracyScore: number | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  activatedAt: string | null;
  deactivatedAt: string | null;
  metadata: Record<string, unknown> | null;
}

/**
 * Register a new model version
 */
export async function registerModelVersion(
  input: ModelVersionInput
): Promise<{ success: boolean; modelVersionId?: string; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("model_versions")
    .insert({
      model_type: input.modelType,
      version: input.version,
      provider: input.provider,
      model_id: input.modelId,
      base_model: input.baseModel,
      training_data_count: input.trainingDataCount || 0,
      accuracy_score: input.accuracyScore,
      is_active: false,
      is_default: false,
      metadata: (input.metadata || {}) as Json,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, modelVersionId: data.id };
}

/**
 * Get all model versions for a specific type
 */
export async function getModelVersions(
  modelType: ModelType
): Promise<{ success: boolean; versions?: ModelVersion[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("model_versions")
    .select("*")
    .eq("model_type", modelType)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    versions: data?.map(v => ({
      id: v.id,
      modelType: v.model_type as ModelType,
      version: v.version,
      provider: v.provider as ModelProvider,
      modelId: v.model_id,
      baseModel: v.base_model,
      trainingDataCount: v.training_data_count || 0,
      accuracyScore: v.accuracy_score,
      isActive: v.is_active || false,
      isDefault: v.is_default || false,
      createdAt: v.created_at || "",
      activatedAt: v.activated_at,
      deactivatedAt: v.deactivated_at,
      metadata: v.metadata as Record<string, unknown> | null,
    })),
  };
}

/**
 * Get the currently active model version for a type
 */
export async function getActiveModelVersion(
  modelType: ModelType
): Promise<{ success: boolean; version?: ModelVersion; error?: string }> {
  const supabase = await createClient();

  // First try to get the default active model
  const { data: defaultModel, error: defaultError } = await supabase
    .from("model_versions")
    .select("*")
    .eq("model_type", modelType)
    .eq("is_active", true)
    .eq("is_default", true)
    .single();

  if (defaultModel) {
    return {
      success: true,
      version: {
        id: defaultModel.id,
        modelType: defaultModel.model_type as ModelType,
        version: defaultModel.version,
        provider: defaultModel.provider as ModelProvider,
        modelId: defaultModel.model_id,
        baseModel: defaultModel.base_model,
        trainingDataCount: defaultModel.training_data_count || 0,
        accuracyScore: defaultModel.accuracy_score,
        isActive: defaultModel.is_active || false,
        isDefault: defaultModel.is_default || false,
        createdAt: defaultModel.created_at || "",
        activatedAt: defaultModel.activated_at,
        deactivatedAt: defaultModel.deactivated_at,
        metadata: defaultModel.metadata as Record<string, unknown> | null,
      },
    };
  }

  // If no default, get any active model
  const { data, error } = await supabase
    .from("model_versions")
    .select("*")
    .eq("model_type", modelType)
    .eq("is_active", true)
    .order("activated_at", { ascending: false })
    .limit(1)
    .single();

  if (error && !defaultError) {
    return { success: false, error: error.message };
  }

  if (!data) {
    return { success: true }; // No active model
  }

  return {
    success: true,
    version: {
      id: data.id,
      modelType: data.model_type as ModelType,
      version: data.version,
      provider: data.provider as ModelProvider,
      modelId: data.model_id,
      baseModel: data.base_model,
      trainingDataCount: data.training_data_count || 0,
      accuracyScore: data.accuracy_score,
      isActive: data.is_active || false,
      isDefault: data.is_default || false,
      createdAt: data.created_at || "",
      activatedAt: data.activated_at,
      deactivatedAt: data.deactivated_at,
      metadata: data.metadata as Record<string, unknown> | null,
    },
  };
}

/**
 * Activate a model version (and optionally make it default)
 */
export async function activateModelVersion(
  modelVersionId: string,
  makeDefault: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get the model type first
  const { data: model, error: fetchError } = await supabase
    .from("model_versions")
    .select("model_type")
    .eq("id", modelVersionId)
    .single();

  if (fetchError || !model) {
    return { success: false, error: "Model version not found" };
  }

  // If making default, unset other defaults first
  if (makeDefault) {
    await supabase
      .from("model_versions")
      .update({ is_default: false })
      .eq("model_type", model.model_type)
      .neq("id", modelVersionId);
  }

  // Activate the model
  const { error } = await supabase
    .from("model_versions")
    .update({
      is_active: true,
      is_default: makeDefault,
      activated_at: new Date().toISOString(),
      deactivated_at: null,
    })
    .eq("id", modelVersionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Deactivate a model version
 */
export async function deactivateModelVersion(
  modelVersionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("model_versions")
    .update({
      is_active: false,
      is_default: false,
      deactivated_at: new Date().toISOString(),
    })
    .eq("id", modelVersionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Rollback to a previous model version
 */
export async function rollbackToVersion(
  modelVersionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get the model type
  const { data: targetModel, error: fetchError } = await supabase
    .from("model_versions")
    .select("model_type")
    .eq("id", modelVersionId)
    .single();

  if (fetchError || !targetModel) {
    return { success: false, error: "Model version not found" };
  }

  // Deactivate all active models of this type
  await supabase
    .from("model_versions")
    .update({
      is_active: false,
      is_default: false,
      deactivated_at: new Date().toISOString(),
    })
    .eq("model_type", targetModel.model_type)
    .eq("is_active", true);

  // Activate the target version as the default
  const { error } = await supabase
    .from("model_versions")
    .update({
      is_active: true,
      is_default: true,
      activated_at: new Date().toISOString(),
      deactivated_at: null,
    })
    .eq("id", modelVersionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update model version metrics (e.g., after evaluation)
 */
export async function updateModelMetrics(
  modelVersionId: string,
  accuracyScore: number,
  additionalMetadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current metadata
  const { data: currentModel, error: fetchError } = await supabase
    .from("model_versions")
    .select("metadata")
    .eq("id", modelVersionId)
    .single();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  const updatedMetadata = {
    ...(currentModel?.metadata as Record<string, unknown> || {}),
    ...(additionalMetadata || {}),
    lastEvaluatedAt: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("model_versions")
    .update({
      accuracy_score: accuracyScore,
      metadata: updatedMetadata as Json,
    })
    .eq("id", modelVersionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get the model version string to stamp on documents
 */
export async function getModelVersionString(modelType: ModelType): Promise<string> {
  const result = await getActiveModelVersion(modelType);

  if (result.success && result.version) {
    return `${result.version.provider}:${result.version.modelId}@${result.version.version}`;
  }

  // Return a default for the base models
  if (modelType === "extraction") {
    return "mistral:pixtral-12b-latest@base";
  }

  return "mistral:pixtral-12b-latest@base";
}

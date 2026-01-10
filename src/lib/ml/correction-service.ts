"use server";

import { createClient } from "@/lib/supabase/server";
import { Json } from "@/types/database";

export type CorrectionType = "fix" | "add" | "remove";

export interface FieldCorrection {
  documentId: string;
  fieldName: string;
  originalValue: Json;
  correctedValue: Json;
  correctionType: CorrectionType;
  modelVersion?: string;
}

export interface CorrectionResult {
  success: boolean;
  correctionId?: string;
  error?: string;
}

export interface CorrectionStats {
  totalCorrections: number;
  unusedForTraining: number;
  correctionsByField: Record<string, number>;
  correctionsByType: Record<CorrectionType, number>;
}

/**
 * Record a field correction for training data collection
 */
export async function recordFieldCorrection(
  correction: FieldCorrection
): Promise<CorrectionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user?.id || "")
    .single();

  if (!userData?.organization_id) {
    return { success: false, error: "User organization not found" };
  }

  // Get the document's current model version if not provided
  let modelVersion = correction.modelVersion;
  if (!modelVersion) {
    const { data: docData } = await supabase
      .from("documents")
      .select("model_version")
      .eq("id", correction.documentId)
      .single();
    modelVersion = docData?.model_version || undefined;
  }

  const { data, error } = await supabase
    .from("field_corrections")
    .insert({
      document_id: correction.documentId,
      organization_id: userData.organization_id,
      field_name: correction.fieldName,
      original_value: correction.originalValue,
      corrected_value: correction.correctedValue,
      correction_type: correction.correctionType,
      model_version: modelVersion,
      corrected_by: user?.id,
      used_for_training: false,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, correctionId: data.id };
}

/**
 * Record multiple field corrections at once (for batch updates)
 */
export async function recordBatchCorrections(
  documentId: string,
  originalData: Record<string, unknown>,
  correctedData: Record<string, unknown>
): Promise<{ success: boolean; correctionsRecorded: number; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user?.id || "")
    .single();

  if (!userData?.organization_id) {
    return { success: false, correctionsRecorded: 0, error: "User organization not found" };
  }

  // Get the document's model version
  const { data: docData } = await supabase
    .from("documents")
    .select("model_version")
    .eq("id", documentId)
    .single();

  const corrections: Array<{
    document_id: string;
    organization_id: string;
    field_name: string;
    original_value: Json;
    corrected_value: Json;
    correction_type: string;
    model_version: string | null;
    corrected_by: string | undefined;
    used_for_training: boolean;
  }> = [];

  // Find all fields that have changed
  for (const key of Object.keys(correctedData)) {
    const originalValue = originalData[key];
    const correctedValue = correctedData[key];

    // Check if the value has changed
    if (JSON.stringify(originalValue) !== JSON.stringify(correctedValue)) {
      let correctionType: CorrectionType = "fix";

      if (originalValue === undefined || originalValue === null || originalValue === "") {
        correctionType = "add";
      } else if (correctedValue === undefined || correctedValue === null || correctedValue === "") {
        correctionType = "remove";
      }

      corrections.push({
        document_id: documentId,
        organization_id: userData.organization_id,
        field_name: key,
        original_value: originalValue as Json,
        corrected_value: correctedValue as Json,
        correction_type: correctionType,
        model_version: docData?.model_version || null,
        corrected_by: user?.id,
        used_for_training: false,
      });
    }
  }

  if (corrections.length === 0) {
    return { success: true, correctionsRecorded: 0 };
  }

  const { error } = await supabase
    .from("field_corrections")
    .insert(corrections);

  if (error) {
    return { success: false, correctionsRecorded: 0, error: error.message };
  }

  return { success: true, correctionsRecorded: corrections.length };
}

/**
 * Get correction statistics for the organization
 */
export async function getCorrectionStats(): Promise<{
  success: boolean;
  stats?: CorrectionStats;
  error?: string
}> {
  const supabase = await createClient();

  // Get all corrections
  const { data: corrections, error } = await supabase
    .from("field_corrections")
    .select("id, field_name, correction_type, used_for_training");

  if (error) {
    return { success: false, error: error.message };
  }

  const stats: CorrectionStats = {
    totalCorrections: corrections?.length || 0,
    unusedForTraining: 0,
    correctionsByField: {},
    correctionsByType: { fix: 0, add: 0, remove: 0 },
  };

  for (const correction of corrections || []) {
    // Count unused for training
    if (!correction.used_for_training) {
      stats.unusedForTraining++;
    }

    // Count by field
    const fieldName = correction.field_name;
    stats.correctionsByField[fieldName] = (stats.correctionsByField[fieldName] || 0) + 1;

    // Count by type
    const correctionType = correction.correction_type as CorrectionType;
    if (correctionType in stats.correctionsByType) {
      stats.correctionsByType[correctionType]++;
    }
  }

  return { success: true, stats };
}

/**
 * Get unused corrections for training (not yet used in any training batch)
 */
export async function getUnusedCorrections(limit: number = 1000): Promise<{
  success: boolean;
  corrections?: Array<{
    id: string;
    documentId: string;
    fieldName: string;
    originalValue: Json;
    correctedValue: Json;
    correctionType: string;
    modelVersion: string | null;
    createdAt: string;
  }>;
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("field_corrections")
    .select("id, document_id, field_name, original_value, corrected_value, correction_type, model_version, created_at")
    .eq("used_for_training", false)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    corrections: data?.map(c => ({
      id: c.id,
      documentId: c.document_id,
      fieldName: c.field_name,
      originalValue: c.original_value,
      correctedValue: c.corrected_value,
      correctionType: c.correction_type,
      modelVersion: c.model_version,
      createdAt: c.created_at || "",
    })),
  };
}

/**
 * Mark corrections as used in a training batch
 */
export async function markCorrectionsUsed(
  correctionIds: string[],
  trainingBatchId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("field_corrections")
    .update({
      used_for_training: true,
      training_batch_id: trainingBatchId,
    })
    .in("id", correctionIds);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get corrections for a specific document
 */
export async function getDocumentCorrections(documentId: string): Promise<{
  success: boolean;
  corrections?: Array<{
    id: string;
    fieldName: string;
    originalValue: Json;
    correctedValue: Json;
    correctionType: string;
    createdAt: string;
  }>;
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("field_corrections")
    .select("id, field_name, original_value, corrected_value, correction_type, created_at")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    corrections: data?.map(c => ({
      id: c.id,
      fieldName: c.field_name,
      originalValue: c.original_value,
      correctedValue: c.corrected_value,
      correctionType: c.correction_type,
      createdAt: c.created_at || "",
    })),
  };
}

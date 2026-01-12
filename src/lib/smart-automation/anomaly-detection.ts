"use server";

import { createClient } from "@/lib/supabase/server";
import { Json } from "@/types/database";

export type AnomalyType =
  | "amount_outlier"
  | "duplicate_suspected"
  | "entity_mismatch"
  | "cross_field_invalid"
  | "pattern_deviation"
  | "statistical_outlier";

export interface AnomalyDetection {
  id: string;
  documentId: string;
  organizationId: string;
  anomalyType: AnomalyType;
  fieldName: string | null;
  detectedValue: unknown;
  expectedRange: {
    min?: number;
    max?: number;
    mean?: number;
    std?: number;
  } | null;
  deviationScore: number | null;
  context: Record<string, unknown> | null;
  resolved: boolean;
  resolution: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface StatisticalContext {
  mean: number;
  std: number;
  min: number;
  max: number;
  count: number;
  percentile95: number;
}

/**
 * Get organization AI settings
 */
export async function getOrganizationAISettings(organizationId?: string): Promise<{
  success: boolean;
  settings?: {
    highConfidenceThreshold: number;
    mediumConfidenceThreshold: number;
    lowConfidenceThreshold: number;
    autoApprovalEnabled: boolean;
    autoApprovalMinConfidence: number;
    autoApprovalRequireNoFlags: boolean;
    autoApprovalDocumentTypes: string[] | null;
    amountAnomalyThreshold: number;
    enableDuplicateDetection: boolean;
    duplicateSimilarityThreshold: number;
    autoRetrainEnabled: boolean;
    retrainCorrectionThreshold: number;
    retrainAccuracyThreshold: number;
    // Flag detection thresholds
    pastDueCriticalDays: number;
    pastDueWarningDays: number;
    highAmountWarning: number;
    highAmountCritical: number;
    contractExpirationWarningDays: number;
  };
  error?: string;
}> {
  const supabase = await createClient();

  let orgId: string | undefined = organizationId;
  if (!orgId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }
    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    orgId = userData?.organization_id ?? undefined;
  }

  if (!orgId) {
    return { success: false, error: "No organization found" };
  }

  const { data, error } = await supabase
    .from("organization_ai_settings")
    .select("*")
    .eq("organization_id", orgId)
    .single();

  if (error && error.code !== "PGRST116") {
    return { success: false, error: error.message };
  }

  // Return defaults if no settings exist
  const settings = {
    highConfidenceThreshold: data?.high_confidence_threshold ?? 0.90,
    mediumConfidenceThreshold: data?.medium_confidence_threshold ?? 0.70,
    lowConfidenceThreshold: data?.low_confidence_threshold ?? 0.50,
    autoApprovalEnabled: data?.auto_approval_enabled ?? false,
    autoApprovalMinConfidence: data?.auto_approval_min_confidence ?? 0.95,
    autoApprovalRequireNoFlags: data?.auto_approval_require_no_flags ?? true,
    autoApprovalDocumentTypes: data?.auto_approval_document_types ?? null,
    amountAnomalyThreshold: data?.amount_anomaly_threshold ?? 3.0,
    enableDuplicateDetection: data?.enable_duplicate_detection ?? true,
    duplicateSimilarityThreshold: data?.duplicate_similarity_threshold ?? 0.95,
    autoRetrainEnabled: data?.auto_retrain_enabled ?? false,
    retrainCorrectionThreshold: data?.retrain_correction_threshold ?? 1000,
    retrainAccuracyThreshold: data?.retrain_accuracy_threshold ?? 0.95,
    // Flag detection thresholds (with defaults matching FLAG_THRESHOLDS)
    pastDueCriticalDays: data?.past_due_critical_days ?? 30,
    pastDueWarningDays: data?.past_due_warning_days ?? 7,
    highAmountWarning: data?.high_amount_warning ?? 100000,
    highAmountCritical: data?.high_amount_critical ?? 500000,
    contractExpirationWarningDays: data?.contract_expiration_warning_days ?? 30,
  };

  return { success: true, settings };
}

/**
 * Update organization AI settings
 */
export async function updateOrganizationAISettings(
  settings: Partial<{
    highConfidenceThreshold: number;
    mediumConfidenceThreshold: number;
    lowConfidenceThreshold: number;
    autoApprovalEnabled: boolean;
    autoApprovalMinConfidence: number;
    autoApprovalRequireNoFlags: boolean;
    autoApprovalDocumentTypes: string[] | null;
    amountAnomalyThreshold: number;
    enableDuplicateDetection: boolean;
    duplicateSimilarityThreshold: number;
    autoRetrainEnabled: boolean;
    retrainCorrectionThreshold: number;
    retrainAccuracyThreshold: number;
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) {
    return { success: false, error: "No organization found" };
  }

  const updateData: Record<string, unknown> = {
    organization_id: userData.organization_id,
    updated_at: new Date().toISOString(),
  };

  if (settings.highConfidenceThreshold !== undefined) {
    updateData.high_confidence_threshold = settings.highConfidenceThreshold;
  }
  if (settings.mediumConfidenceThreshold !== undefined) {
    updateData.medium_confidence_threshold = settings.mediumConfidenceThreshold;
  }
  if (settings.lowConfidenceThreshold !== undefined) {
    updateData.low_confidence_threshold = settings.lowConfidenceThreshold;
  }
  if (settings.autoApprovalEnabled !== undefined) {
    updateData.auto_approval_enabled = settings.autoApprovalEnabled;
  }
  if (settings.autoApprovalMinConfidence !== undefined) {
    updateData.auto_approval_min_confidence = settings.autoApprovalMinConfidence;
  }
  if (settings.autoApprovalRequireNoFlags !== undefined) {
    updateData.auto_approval_require_no_flags = settings.autoApprovalRequireNoFlags;
  }
  if (settings.autoApprovalDocumentTypes !== undefined) {
    updateData.auto_approval_document_types = settings.autoApprovalDocumentTypes;
  }
  if (settings.amountAnomalyThreshold !== undefined) {
    updateData.amount_anomaly_threshold = settings.amountAnomalyThreshold;
  }
  if (settings.enableDuplicateDetection !== undefined) {
    updateData.enable_duplicate_detection = settings.enableDuplicateDetection;
  }
  if (settings.duplicateSimilarityThreshold !== undefined) {
    updateData.duplicate_similarity_threshold = settings.duplicateSimilarityThreshold;
  }
  if (settings.autoRetrainEnabled !== undefined) {
    updateData.auto_retrain_enabled = settings.autoRetrainEnabled;
  }
  if (settings.retrainCorrectionThreshold !== undefined) {
    updateData.retrain_correction_threshold = settings.retrainCorrectionThreshold;
  }
  if (settings.retrainAccuracyThreshold !== undefined) {
    updateData.retrain_accuracy_threshold = settings.retrainAccuracyThreshold;
  }

  const { error } = await supabase
    .from("organization_ai_settings")
    .upsert(updateData, { onConflict: "organization_id" });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Detect statistical amount outliers
 */
export async function detectAmountOutlier(
  documentId: string,
  fieldName: string,
  amount: number,
  documentType?: string,
  vendorName?: string
): Promise<{
  success: boolean;
  isOutlier: boolean;
  anomalyId?: string;
  context?: StatisticalContext;
  zScore?: number;
  error?: string;
}> {
  const supabase = await createClient();

  // Get organization settings
  const settingsResult = await getOrganizationAISettings();
  if (!settingsResult.success || !settingsResult.settings) {
    return { success: false, isOutlier: false, error: settingsResult.error };
  }

  const threshold = settingsResult.settings.amountAnomalyThreshold;

  // Get historical amounts for similar documents
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, isOutlier: false, error: "Not authenticated" };
  }

  const { data: userOrg } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", userData.user.id)
    .single();

  if (!userOrg?.organization_id) {
    return { success: false, isOutlier: false, error: "No organization found" };
  }

  // Build query for historical amounts
  let query = supabase
    .from("documents")
    .select("extracted_data")
    .eq("organization_id", userOrg.organization_id)
    .eq("status", "completed")
    .neq("id", documentId);

  if (documentType) {
    query = query.eq("document_type", documentType);
  }

  const { data: historicalDocs, error: histError } = await query.limit(100);

  if (histError) {
    return { success: false, isOutlier: false, error: histError.message };
  }

  // Extract amounts from historical documents
  const historicalAmounts: number[] = [];
  for (const doc of historicalDocs || []) {
    const extractedData = doc.extracted_data as Record<string, unknown> | null;
    if (extractedData && typeof extractedData[fieldName] === "number") {
      historicalAmounts.push(extractedData[fieldName] as number);
    }
  }

  // Need at least 10 historical data points for meaningful statistics
  if (historicalAmounts.length < 10) {
    return { success: true, isOutlier: false };
  }

  // Calculate statistics
  const mean = historicalAmounts.reduce((a, b) => a + b, 0) / historicalAmounts.length;
  const squaredDiffs = historicalAmounts.map(x => Math.pow(x - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / historicalAmounts.length;
  const std = Math.sqrt(variance);

  // Calculate z-score
  const zScore = std > 0 ? (amount - mean) / std : 0;
  const isOutlier = Math.abs(zScore) > threshold;

  // Calculate percentile 95
  const sorted = [...historicalAmounts].sort((a, b) => a - b);
  const percentile95Index = Math.floor(sorted.length * 0.95);
  const percentile95 = sorted[percentile95Index] || sorted[sorted.length - 1];

  const context: StatisticalContext = {
    mean,
    std,
    min: Math.min(...historicalAmounts),
    max: Math.max(...historicalAmounts),
    count: historicalAmounts.length,
    percentile95,
  };

  if (isOutlier) {
    // Record the anomaly
    const { data: anomaly, error: anomalyError } = await supabase
      .from("anomaly_detections")
      .insert({
        document_id: documentId,
        organization_id: userOrg.organization_id,
        anomaly_type: "amount_outlier",
        field_name: fieldName,
        detected_value: { amount } as unknown as Json,
        expected_range: { mean, std, min: context.min, max: context.max } as unknown as Json,
        deviation_score: zScore,
        context: { vendorName, documentType, historicalCount: context.count } as unknown as Json,
      })
      .select("id")
      .single();

    if (anomalyError) {
      console.error("Failed to record anomaly:", anomalyError);
    }

    return {
      success: true,
      isOutlier: true,
      anomalyId: anomaly?.id,
      context,
      zScore,
    };
  }

  return { success: true, isOutlier: false, context, zScore };
}

/**
 * Resolve an anomaly detection
 */
export async function resolveAnomaly(
  anomalyId: string,
  resolution: "confirmed_anomaly" | "false_positive" | "ignored"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("anomaly_detections")
    .update({
      resolved: true,
      resolution,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", anomalyId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get unresolved anomalies for an organization
 */
export async function getUnresolvedAnomalies(
  limit: number = 50
): Promise<{
  success: boolean;
  anomalies?: AnomalyDetection[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("anomaly_detections")
    .select(`
      *,
      documents (
        file_name,
        document_type,
        document_number
      )
    `)
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    anomalies: data?.map(a => ({
      id: a.id,
      documentId: a.document_id || "",
      organizationId: a.organization_id || "",
      anomalyType: a.anomaly_type as AnomalyType,
      fieldName: a.field_name,
      detectedValue: a.detected_value,
      expectedRange: a.expected_range as AnomalyDetection["expectedRange"],
      deviationScore: a.deviation_score,
      context: a.context as Record<string, unknown> | null,
      resolved: a.resolved || false,
      resolution: a.resolution,
      resolvedBy: a.resolved_by,
      resolvedAt: a.resolved_at,
      createdAt: a.created_at || "",
    })),
  };
}

/**
 * Run all anomaly checks on a document
 */
export async function runAnomalyDetection(
  documentId: string,
  extractedData: Record<string, unknown>,
  documentType?: string
): Promise<{
  success: boolean;
  anomalies: Array<{
    type: AnomalyType;
    fieldName?: string;
    message: string;
    severity: "info" | "warning" | "critical";
    anomalyId?: string;
  }>;
  error?: string;
}> {
  const anomalies: Array<{
    type: AnomalyType;
    fieldName?: string;
    message: string;
    severity: "info" | "warning" | "critical";
    anomalyId?: string;
  }> = [];

  // Check amount fields for outliers
  const amountFields = ["total", "amount", "subtotal", "tax", "total_amount"];
  for (const field of amountFields) {
    if (typeof extractedData[field] === "number") {
      const result = await detectAmountOutlier(
        documentId,
        field,
        extractedData[field] as number,
        documentType,
        extractedData.vendor_name as string | undefined
      );

      if (result.success && result.isOutlier) {
        anomalies.push({
          type: "amount_outlier",
          fieldName: field,
          message: `${field} of ${extractedData[field]} is ${result.zScore?.toFixed(1)} standard deviations from the mean (${result.context?.mean?.toFixed(2)})`,
          severity: Math.abs(result.zScore || 0) > 5 ? "critical" : "warning",
          anomalyId: result.anomalyId,
        });
      }
    }
  }

  return { success: true, anomalies };
}

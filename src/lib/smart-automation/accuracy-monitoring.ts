"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrganizationAISettings } from "./anomaly-detection";

export interface AccuracyMetrics {
  date: string;
  documentType: string | null;
  totalDocuments: number;
  approvedDocuments: number;
  rejectedDocuments: number;
  documentsWithCorrections: number;
  totalFieldCorrections: number;
  avgClassificationConfidence: number | null;
  avgExtractionConfidence: number | null;
  avgProcessingTimeMs: number | null;
  avgReviewTimeMs: number | null;
  // Confidence band calibration
  highConfTotal: number;
  highConfCorrect: number;
  mediumConfTotal: number;
  mediumConfCorrect: number;
  lowConfTotal: number;
  lowConfCorrect: number;
  // Flag metrics
  totalFlagsRaised: number;
  flagsResolved: number;
  falsePositiveFlags: number;
  // Auto-approval
  autoApprovedCount: number;
  autoApprovedCorrections: number;
}

export interface AccuracyDashboard {
  // Overall accuracy
  overallAccuracy: number;
  zeroCorrectionsRate: number;
  // Accuracy by document type
  accuracyByType: Array<{
    documentType: string;
    accuracy: number;
    documentCount: number;
    correctionRate: number;
  }>;
  // Most corrected fields
  topCorrectedFields: Array<{
    fieldName: string;
    correctionCount: number;
    correctionRate: number;
  }>;
  // Confidence calibration
  calibration: {
    highBand: { total: number; correct: number; accuracy: number };
    mediumBand: { total: number; correct: number; accuracy: number };
    lowBand: { total: number; correct: number; accuracy: number };
    isCalibrated: boolean;
    calibrationWarnings: string[];
  };
  // Processing metrics
  processingMetrics: {
    avgProcessingTime: number;
    avgReviewTime: number;
    documentsProcessedToday: number;
    documentsProcessedThisWeek: number;
  };
  // Flag metrics
  flagMetrics: {
    totalFlagsRaised: number;
    flagsResolved: number;
    falsePositiveRate: number;
  };
  // Auto-approval metrics
  autoApprovalMetrics: {
    enabled: boolean;
    autoApprovedCount: number;
    autoApprovalCorrectionRate: number;
  };
  // Trend
  accuracyTrend: number; // percentage change over last 30 days
}

/**
 * Get accuracy metrics for a date range
 */
export async function getAccuracyMetrics(
  startDate: string,
  endDate: string,
  documentType?: string
): Promise<{
  success: boolean;
  metrics?: AccuracyMetrics[];
  error?: string;
}> {
  const supabase = await createClient();

  let query = supabase
    .from("accuracy_metrics")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });

  if (documentType) {
    query = query.eq("document_type", documentType);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    metrics: data?.map(m => ({
      date: m.date,
      documentType: m.document_type,
      totalDocuments: m.total_documents || 0,
      approvedDocuments: m.approved_documents || 0,
      rejectedDocuments: m.rejected_documents || 0,
      documentsWithCorrections: m.documents_with_corrections || 0,
      totalFieldCorrections: m.total_field_corrections || 0,
      avgClassificationConfidence: m.avg_classification_confidence,
      avgExtractionConfidence: m.avg_extraction_confidence,
      avgProcessingTimeMs: m.avg_processing_time_ms,
      avgReviewTimeMs: m.avg_review_time_ms,
      highConfTotal: m.high_conf_total || 0,
      highConfCorrect: m.high_conf_correct || 0,
      mediumConfTotal: m.medium_conf_total || 0,
      mediumConfCorrect: m.medium_conf_correct || 0,
      lowConfTotal: m.low_conf_total || 0,
      lowConfCorrect: m.low_conf_correct || 0,
      totalFlagsRaised: m.total_flags_raised || 0,
      flagsResolved: m.flags_resolved || 0,
      falsePositiveFlags: m.false_positive_flags || 0,
      autoApprovedCount: m.auto_approved_count || 0,
      autoApprovedCorrections: m.auto_approved_corrections || 0,
    })),
  };
}

/**
 * Get comprehensive accuracy dashboard data
 */
export async function getAccuracyDashboard(): Promise<{
  success: boolean;
  dashboard?: AccuracyDashboard;
  error?: string;
}> {
  const supabase = await createClient();

  // Get date ranges
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(today);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Get last 30 days metrics
  const { data: recentMetrics, error: metricsError } = await supabase
    .from("accuracy_metrics")
    .select("*")
    .gte("date", thirtyDaysAgo.toISOString().split("T")[0]);

  if (metricsError) {
    return { success: false, error: metricsError.message };
  }

  // Get previous 30 days for trend
  const { data: previousMetrics } = await supabase
    .from("accuracy_metrics")
    .select("*")
    .gte("date", sixtyDaysAgo.toISOString().split("T")[0])
    .lt("date", thirtyDaysAgo.toISOString().split("T")[0]);

  // Get field correction stats
  const { data: corrections } = await supabase
    .from("field_corrections")
    .select("field_name")
    .gte("created_at", thirtyDaysAgo.toISOString());

  // Get settings
  const settingsResult = await getOrganizationAISettings();

  // Aggregate metrics
  const aggregated = aggregateMetrics(recentMetrics || []);
  const previousAggregated = aggregateMetrics(previousMetrics || []);

  // Calculate accuracy by type
  const typeMap = new Map<string, { total: number; withCorrections: number }>();
  for (const m of recentMetrics || []) {
    const type = m.document_type || "unknown";
    const existing = typeMap.get(type) || { total: 0, withCorrections: 0 };
    existing.total += m.total_documents || 0;
    existing.withCorrections += m.documents_with_corrections || 0;
    typeMap.set(type, existing);
  }

  const accuracyByType = Array.from(typeMap.entries()).map(([type, stats]) => ({
    documentType: type,
    accuracy: stats.total > 0 ? (stats.total - stats.withCorrections) / stats.total : 0,
    documentCount: stats.total,
    correctionRate: stats.total > 0 ? stats.withCorrections / stats.total : 0,
  })).sort((a, b) => b.documentCount - a.documentCount);

  // Calculate top corrected fields
  const fieldCounts = new Map<string, number>();
  for (const c of corrections || []) {
    fieldCounts.set(c.field_name, (fieldCounts.get(c.field_name) || 0) + 1);
  }

  const totalCorrections = corrections?.length || 0;
  const topCorrectedFields = Array.from(fieldCounts.entries())
    .map(([fieldName, count]) => ({
      fieldName,
      correctionCount: count,
      correctionRate: totalCorrections > 0 ? count / totalCorrections : 0,
    }))
    .sort((a, b) => b.correctionCount - a.correctionCount)
    .slice(0, 10);

  // Calculate confidence calibration
  const calibration = calculateCalibration(aggregated);

  // Calculate trend
  const currentAccuracy = aggregated.totalDocs > 0
    ? (aggregated.totalDocs - aggregated.docsWithCorrections) / aggregated.totalDocs
    : 0;
  const previousAccuracy = previousAggregated.totalDocs > 0
    ? (previousAggregated.totalDocs - previousAggregated.docsWithCorrections) / previousAggregated.totalDocs
    : 0;
  const accuracyTrend = previousAccuracy > 0
    ? ((currentAccuracy - previousAccuracy) / previousAccuracy) * 100
    : 0;

  // Calculate today and this week counts
  const todayStr = today.toISOString().split("T")[0];
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const todayDocs = (recentMetrics || [])
    .filter(m => m.date === todayStr)
    .reduce((sum, m) => sum + (m.total_documents || 0), 0);

  const weekDocs = (recentMetrics || [])
    .filter(m => m.date >= weekAgoStr)
    .reduce((sum, m) => sum + (m.total_documents || 0), 0);

  return {
    success: true,
    dashboard: {
      overallAccuracy: currentAccuracy,
      zeroCorrectionsRate: aggregated.totalDocs > 0
        ? (aggregated.totalDocs - aggregated.docsWithCorrections) / aggregated.totalDocs
        : 0,
      accuracyByType,
      topCorrectedFields,
      calibration,
      processingMetrics: {
        avgProcessingTime: aggregated.avgProcessingTime,
        avgReviewTime: aggregated.avgReviewTime,
        documentsProcessedToday: todayDocs,
        documentsProcessedThisWeek: weekDocs,
      },
      flagMetrics: {
        totalFlagsRaised: aggregated.totalFlags,
        flagsResolved: aggregated.flagsResolved,
        falsePositiveRate: aggregated.totalFlags > 0
          ? aggregated.falsePositives / aggregated.totalFlags
          : 0,
      },
      autoApprovalMetrics: {
        enabled: settingsResult.settings?.autoApprovalEnabled || false,
        autoApprovedCount: aggregated.autoApproved,
        autoApprovalCorrectionRate: aggregated.autoApproved > 0
          ? aggregated.autoApprovedCorrections / aggregated.autoApproved
          : 0,
      },
      accuracyTrend,
    },
  };
}

interface AggregatedMetrics {
  totalDocs: number;
  docsWithCorrections: number;
  totalCorrections: number;
  highConfTotal: number;
  highConfCorrect: number;
  mediumConfTotal: number;
  mediumConfCorrect: number;
  lowConfTotal: number;
  lowConfCorrect: number;
  avgProcessingTime: number;
  avgReviewTime: number;
  totalFlags: number;
  flagsResolved: number;
  falsePositives: number;
  autoApproved: number;
  autoApprovedCorrections: number;
}

function aggregateMetrics(metrics: Array<Record<string, unknown>>): AggregatedMetrics {
  const result: AggregatedMetrics = {
    totalDocs: 0,
    docsWithCorrections: 0,
    totalCorrections: 0,
    highConfTotal: 0,
    highConfCorrect: 0,
    mediumConfTotal: 0,
    mediumConfCorrect: 0,
    lowConfTotal: 0,
    lowConfCorrect: 0,
    avgProcessingTime: 0,
    avgReviewTime: 0,
    totalFlags: 0,
    flagsResolved: 0,
    falsePositives: 0,
    autoApproved: 0,
    autoApprovedCorrections: 0,
  };

  let processingTimeSum = 0;
  let processingTimeCount = 0;
  let reviewTimeSum = 0;
  let reviewTimeCount = 0;

  for (const m of metrics) {
    result.totalDocs += (m.total_documents as number) || 0;
    result.docsWithCorrections += (m.documents_with_corrections as number) || 0;
    result.totalCorrections += (m.total_field_corrections as number) || 0;
    result.highConfTotal += (m.high_conf_total as number) || 0;
    result.highConfCorrect += (m.high_conf_correct as number) || 0;
    result.mediumConfTotal += (m.medium_conf_total as number) || 0;
    result.mediumConfCorrect += (m.medium_conf_correct as number) || 0;
    result.lowConfTotal += (m.low_conf_total as number) || 0;
    result.lowConfCorrect += (m.low_conf_correct as number) || 0;
    result.totalFlags += (m.total_flags_raised as number) || 0;
    result.flagsResolved += (m.flags_resolved as number) || 0;
    result.falsePositives += (m.false_positive_flags as number) || 0;
    result.autoApproved += (m.auto_approved_count as number) || 0;
    result.autoApprovedCorrections += (m.auto_approved_corrections as number) || 0;

    if (m.avg_processing_time_ms) {
      processingTimeSum += (m.avg_processing_time_ms as number) * ((m.total_documents as number) || 1);
      processingTimeCount += (m.total_documents as number) || 1;
    }
    if (m.avg_review_time_ms) {
      reviewTimeSum += (m.avg_review_time_ms as number) * ((m.total_documents as number) || 1);
      reviewTimeCount += (m.total_documents as number) || 1;
    }
  }

  result.avgProcessingTime = processingTimeCount > 0 ? processingTimeSum / processingTimeCount : 0;
  result.avgReviewTime = reviewTimeCount > 0 ? reviewTimeSum / reviewTimeCount : 0;

  return result;
}

function calculateCalibration(metrics: AggregatedMetrics): AccuracyDashboard["calibration"] {
  const highAccuracy = metrics.highConfTotal > 0
    ? metrics.highConfCorrect / metrics.highConfTotal
    : 1;
  const mediumAccuracy = metrics.mediumConfTotal > 0
    ? metrics.mediumConfCorrect / metrics.mediumConfTotal
    : 1;
  const lowAccuracy = metrics.lowConfTotal > 0
    ? metrics.lowConfCorrect / metrics.lowConfTotal
    : 1;

  const warnings: string[] = [];

  // Check calibration (predicted confidence should match actual accuracy)
  // High confidence (90%+) should have 90%+ accuracy
  if (metrics.highConfTotal >= 30 && highAccuracy < 0.85) {
    warnings.push(`High confidence band is overconfident: ${(highAccuracy * 100).toFixed(1)}% accuracy vs 90%+ expected`);
  }

  // Medium confidence (70-90%) should have 70-90% accuracy
  if (metrics.mediumConfTotal >= 30) {
    if (mediumAccuracy < 0.60) {
      warnings.push(`Medium confidence band is overconfident: ${(mediumAccuracy * 100).toFixed(1)}% accuracy vs 70%+ expected`);
    }
  }

  // Low confidence (<70%) should have reasonable accuracy
  if (metrics.lowConfTotal >= 30 && lowAccuracy < 0.40) {
    warnings.push(`Low confidence band has very low accuracy: ${(lowAccuracy * 100).toFixed(1)}%`);
  }

  return {
    highBand: {
      total: metrics.highConfTotal,
      correct: metrics.highConfCorrect,
      accuracy: highAccuracy,
    },
    mediumBand: {
      total: metrics.mediumConfTotal,
      correct: metrics.mediumConfCorrect,
      accuracy: mediumAccuracy,
    },
    lowBand: {
      total: metrics.lowConfTotal,
      correct: metrics.lowConfCorrect,
      accuracy: lowAccuracy,
    },
    isCalibrated: warnings.length === 0,
    calibrationWarnings: warnings,
  };
}

/**
 * Get accuracy summary for a specific document type
 */
export async function getDocumentTypeAccuracy(
  documentType: string,
  days: number = 30
): Promise<{
  success: boolean;
  accuracy?: number;
  documentCount?: number;
  correctionRate?: number;
  trend?: number;
  error?: string;
}> {
  const supabase = await createClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("accuracy_metrics")
    .select("*")
    .eq("document_type", documentType)
    .gte("date", startDate.toISOString().split("T")[0]);

  if (error) {
    return { success: false, error: error.message };
  }

  const aggregated = aggregateMetrics(data || []);
  const accuracy = aggregated.totalDocs > 0
    ? (aggregated.totalDocs - aggregated.docsWithCorrections) / aggregated.totalDocs
    : 0;

  return {
    success: true,
    accuracy,
    documentCount: aggregated.totalDocs,
    correctionRate: aggregated.totalDocs > 0
      ? aggregated.docsWithCorrections / aggregated.totalDocs
      : 0,
  };
}

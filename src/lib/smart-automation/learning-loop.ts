"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrganizationAISettings } from "./anomaly-detection";
import { getCorrectionStats } from "@/lib/ml/correction-service";

export interface LearningLoopStatus {
  correctionsAvailable: number;
  correctionsUsed: number;
  retrainThreshold: number;
  shouldTriggerRetrain: boolean;
  lastRetrainDate: string | null;
  currentAccuracy: number | null;
  accuracyThreshold: number;
  accuracyBelowThreshold: boolean;
}

/**
 * Check if retraining should be triggered
 */
export async function checkRetrainTrigger(): Promise<{
  success: boolean;
  status?: LearningLoopStatus;
  error?: string;
}> {
  // Get organization settings
  const settingsResult = await getOrganizationAISettings();
  if (!settingsResult.success || !settingsResult.settings) {
    return { success: false, error: settingsResult.error };
  }

  const settings = settingsResult.settings;

  if (!settings.autoRetrainEnabled) {
    return {
      success: true,
      status: {
        correctionsAvailable: 0,
        correctionsUsed: 0,
        retrainThreshold: settings.retrainCorrectionThreshold,
        shouldTriggerRetrain: false,
        lastRetrainDate: null,
        currentAccuracy: null,
        accuracyThreshold: settings.retrainAccuracyThreshold,
        accuracyBelowThreshold: false,
      },
    };
  }

  // Get correction stats
  const statsResult = await getCorrectionStats();
  const totalCorrections = statsResult.stats?.totalCorrections || 0;
  const unusedForTraining = statsResult.stats?.unusedForTraining || 0;
  const usedForTraining = totalCorrections - unusedForTraining;
  const unusedCorrections = unusedForTraining;

  // Get recent accuracy
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let currentAccuracy: number | null = null;
  let lastRetrainDate: string | null = null;

  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (userData?.organization_id) {
      // Get recent accuracy from metrics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: metrics } = await supabase
        .from("accuracy_metrics")
        .select("*")
        .eq("organization_id", userData.organization_id)
        .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (metrics && metrics.length > 0) {
        // Calculate overall accuracy from metrics
        const totalDocs = metrics.reduce((sum, m) => sum + (m.total_documents || 0), 0);
        const docsWithCorrections = metrics.reduce((sum, m) => sum + (m.documents_with_corrections || 0), 0);

        if (totalDocs > 0) {
          currentAccuracy = (totalDocs - docsWithCorrections) / totalDocs;
        }
      }

      // Get last retrain date
      const { data: batches } = await supabase
        .from("training_batches")
        .select("completed_at")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1);

      if (batches && batches.length > 0) {
        lastRetrainDate = batches[0].completed_at;
      }
    }
  }

  const shouldTriggerByCorrections = unusedCorrections >= settings.retrainCorrectionThreshold;
  const accuracyBelowThreshold = currentAccuracy !== null && currentAccuracy < settings.retrainAccuracyThreshold;
  const shouldTriggerRetrain = shouldTriggerByCorrections || accuracyBelowThreshold;

  return {
    success: true,
    status: {
      correctionsAvailable: unusedCorrections,
      correctionsUsed: usedForTraining,
      retrainThreshold: settings.retrainCorrectionThreshold,
      shouldTriggerRetrain,
      lastRetrainDate,
      currentAccuracy,
      accuracyThreshold: settings.retrainAccuracyThreshold,
      accuracyBelowThreshold,
    },
  };
}

/**
 * Record metrics when a document is approved (for learning loop tracking)
 */
export async function recordDocumentApproval(
  documentId: string,
  documentType: string | null,
  wasEdited: boolean,
  correctionCount: number,
  classificationConfidence: number | null,
  extractionConfidence: number | null,
  processingTimeMs: number | null,
  reviewTimeMs: number | null
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

  const today = new Date().toISOString().split("T")[0];

  // Get AI settings for confidence bands
  const settingsResult = await getOrganizationAISettings(userData.organization_id);
  const settings = settingsResult.settings;

  // Determine confidence band
  const overallConfidence = Math.min(classificationConfidence || 0, extractionConfidence || 0);
  let confBand: "high" | "medium" | "low" = "low";
  if (settings) {
    if (overallConfidence >= settings.highConfidenceThreshold) {
      confBand = "high";
    } else if (overallConfidence >= settings.mediumConfidenceThreshold) {
      confBand = "medium";
    }
  }

  // Get or create today's metrics
  const { data: existing } = await supabase
    .from("accuracy_metrics")
    .select("*")
    .eq("organization_id", userData.organization_id)
    .eq("date", today)
    .eq("document_type", documentType || "all")
    .single();

  if (existing) {
    // Update existing record
    const updates: Record<string, unknown> = {
      total_documents: (existing.total_documents || 0) + 1,
      approved_documents: (existing.approved_documents || 0) + 1,
    };

    if (wasEdited) {
      updates.documents_with_corrections = (existing.documents_with_corrections || 0) + 1;
      updates.total_field_corrections = (existing.total_field_corrections || 0) + correctionCount;
    }

    // Update confidence band tracking
    if (confBand === "high") {
      updates.high_conf_total = (existing.high_conf_total || 0) + 1;
      if (!wasEdited) {
        updates.high_conf_correct = (existing.high_conf_correct || 0) + 1;
      }
    } else if (confBand === "medium") {
      updates.medium_conf_total = (existing.medium_conf_total || 0) + 1;
      if (!wasEdited) {
        updates.medium_conf_correct = (existing.medium_conf_correct || 0) + 1;
      }
    } else {
      updates.low_conf_total = (existing.low_conf_total || 0) + 1;
      if (!wasEdited) {
        updates.low_conf_correct = (existing.low_conf_correct || 0) + 1;
      }
    }

    // Calculate running averages
    const totalDocs = (existing.total_documents || 0) + 1;
    if (classificationConfidence !== null) {
      const prevSum = (existing.avg_classification_confidence || 0) * (existing.total_documents || 0);
      updates.avg_classification_confidence = (prevSum + classificationConfidence) / totalDocs;
    }
    if (extractionConfidence !== null) {
      const prevSum = (existing.avg_extraction_confidence || 0) * (existing.total_documents || 0);
      updates.avg_extraction_confidence = (prevSum + extractionConfidence) / totalDocs;
    }
    if (processingTimeMs !== null) {
      const prevSum = (existing.avg_processing_time_ms || 0) * (existing.total_documents || 0);
      updates.avg_processing_time_ms = Math.round((prevSum + processingTimeMs) / totalDocs);
    }
    if (reviewTimeMs !== null) {
      const prevSum = (existing.avg_review_time_ms || 0) * (existing.total_documents || 0);
      updates.avg_review_time_ms = Math.round((prevSum + reviewTimeMs) / totalDocs);
    }

    await supabase
      .from("accuracy_metrics")
      .update(updates)
      .eq("id", existing.id);
  } else {
    // Create new record
    await supabase
      .from("accuracy_metrics")
      .insert({
        organization_id: userData.organization_id,
        date: today,
        document_type: documentType || "all",
        total_documents: 1,
        approved_documents: 1,
        documents_with_corrections: wasEdited ? 1 : 0,
        total_field_corrections: correctionCount,
        avg_classification_confidence: classificationConfidence,
        avg_extraction_confidence: extractionConfidence,
        avg_processing_time_ms: processingTimeMs,
        avg_review_time_ms: reviewTimeMs,
        high_conf_total: confBand === "high" ? 1 : 0,
        high_conf_correct: confBand === "high" && !wasEdited ? 1 : 0,
        medium_conf_total: confBand === "medium" ? 1 : 0,
        medium_conf_correct: confBand === "medium" && !wasEdited ? 1 : 0,
        low_conf_total: confBand === "low" ? 1 : 0,
        low_conf_correct: confBand === "low" && !wasEdited ? 1 : 0,
      });
  }

  return { success: true };
}

/**
 * Record when a document is rejected
 */
export async function recordDocumentRejection(
  documentId: string,
  documentType: string | null
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

  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("accuracy_metrics")
    .select("id, total_documents, rejected_documents")
    .eq("organization_id", userData.organization_id)
    .eq("date", today)
    .eq("document_type", documentType || "all")
    .single();

  if (existing) {
    await supabase
      .from("accuracy_metrics")
      .update({
        total_documents: (existing.total_documents || 0) + 1,
        rejected_documents: (existing.rejected_documents || 0) + 1,
      })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("accuracy_metrics")
      .insert({
        organization_id: userData.organization_id,
        date: today,
        document_type: documentType || "all",
        total_documents: 1,
        rejected_documents: 1,
      });
  }

  return { success: true };
}

/**
 * Record flag metrics
 */
export async function recordFlagMetrics(
  documentType: string | null,
  flagsRaised: number,
  flagsResolved: number,
  falsePositives: number
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

  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("accuracy_metrics")
    .select("id, total_flags_raised, flags_resolved, false_positive_flags")
    .eq("organization_id", userData.organization_id)
    .eq("date", today)
    .eq("document_type", documentType || "all")
    .single();

  if (existing) {
    await supabase
      .from("accuracy_metrics")
      .update({
        total_flags_raised: (existing.total_flags_raised || 0) + flagsRaised,
        flags_resolved: (existing.flags_resolved || 0) + flagsResolved,
        false_positive_flags: (existing.false_positive_flags || 0) + falsePositives,
      })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("accuracy_metrics")
      .insert({
        organization_id: userData.organization_id,
        date: today,
        document_type: documentType || "all",
        total_flags_raised: flagsRaised,
        flags_resolved: flagsResolved,
        false_positive_flags: falsePositives,
      });
  }

  return { success: true };
}

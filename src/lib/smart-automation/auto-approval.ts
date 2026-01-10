"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrganizationAISettings } from "./anomaly-detection";
import { runValidation } from "./validation";
import { Json } from "@/types/database";

export interface AutoApprovalResult {
  shouldAutoApprove: boolean;
  reason: string;
  checks: {
    name: string;
    passed: boolean;
    value?: unknown;
    threshold?: unknown;
  }[];
}

/**
 * Check if a document qualifies for auto-approval
 */
export async function checkAutoApproval(
  documentId: string,
  extractedData: Record<string, unknown>,
  documentType: string | null,
  classificationConfidence: number,
  extractionConfidence: number
): Promise<{
  success: boolean;
  result?: AutoApprovalResult;
  error?: string;
}> {
  const checks: AutoApprovalResult["checks"] = [];

  // Get organization AI settings
  const settingsResult = await getOrganizationAISettings();
  if (!settingsResult.success || !settingsResult.settings) {
    return { success: false, error: settingsResult.error };
  }

  const settings = settingsResult.settings;

  // Check if auto-approval is enabled
  if (!settings.autoApprovalEnabled) {
    return {
      success: true,
      result: {
        shouldAutoApprove: false,
        reason: "Auto-approval is disabled for this organization",
        checks: [],
      },
    };
  }

  // Check document type restriction
  if (settings.autoApprovalDocumentTypes && settings.autoApprovalDocumentTypes.length > 0) {
    const typeAllowed = documentType ? settings.autoApprovalDocumentTypes.includes(documentType) : false;
    checks.push({
      name: "Document type allowed",
      passed: typeAllowed,
      value: documentType,
      threshold: settings.autoApprovalDocumentTypes,
    });

    if (!typeAllowed) {
      return {
        success: true,
        result: {
          shouldAutoApprove: false,
          reason: `Document type "${documentType}" is not in the auto-approval list`,
          checks,
        },
      };
    }
  }

  // Check confidence thresholds
  const minConfidence = settings.autoApprovalMinConfidence;
  const overallConfidence = Math.min(classificationConfidence, extractionConfidence);

  checks.push({
    name: "Classification confidence",
    passed: classificationConfidence >= minConfidence,
    value: classificationConfidence,
    threshold: minConfidence,
  });

  checks.push({
    name: "Extraction confidence",
    passed: extractionConfidence >= minConfidence,
    value: extractionConfidence,
    threshold: minConfidence,
  });

  if (overallConfidence < minConfidence) {
    return {
      success: true,
      result: {
        shouldAutoApprove: false,
        reason: `Confidence (${(overallConfidence * 100).toFixed(1)}%) is below threshold (${(minConfidence * 100).toFixed(1)}%)`,
        checks,
      },
    };
  }

  // Check for unresolved flags
  if (settings.autoApprovalRequireNoFlags) {
    const supabase = await createClient();

    const { data: flags, error: flagsError } = await supabase
      .from("document_flags")
      .select("id, flag_type, severity")
      .eq("document_id", documentId)
      .eq("resolved", false);

    if (flagsError) {
      return { success: false, error: flagsError.message };
    }

    const hasUnresolvedFlags = flags && flags.length > 0;
    checks.push({
      name: "No unresolved flags",
      passed: !hasUnresolvedFlags,
      value: flags?.length || 0,
      threshold: 0,
    });

    if (hasUnresolvedFlags) {
      return {
        success: true,
        result: {
          shouldAutoApprove: false,
          reason: `Document has ${flags.length} unresolved flag(s)`,
          checks,
        },
      };
    }
  }

  // Run validation checks
  const validationResult = await runValidation(documentId, extractedData, documentType || undefined);
  const hasValidationErrors = validationResult.results.some(r => !r.passed && (r.severity === "error" || r.severity === "critical"));

  checks.push({
    name: "No validation errors",
    passed: !hasValidationErrors,
    value: validationResult.failedCount,
    threshold: 0,
  });

  if (hasValidationErrors) {
    return {
      success: true,
      result: {
        shouldAutoApprove: false,
        reason: "Document has validation errors",
        checks,
      },
    };
  }

  // All checks passed
  return {
    success: true,
    result: {
      shouldAutoApprove: true,
      reason: "All auto-approval criteria met",
      checks,
    },
  };
}

/**
 * Auto-approve a document
 */
export async function autoApproveDocument(
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("documents")
    .update({
      status: "completed",
      approved_at: new Date().toISOString(),
      approved_by: null, // null indicates auto-approval
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log the auto-approval in audit log
  const { error: auditError } = await supabase
    .from("document_audit_log")
    .insert({
      document_id: documentId,
      user_id: null,
      action: "auto_approved",
      details: { reason: "All auto-approval criteria met" } as Json,
    });

  if (auditError) {
    console.error("Failed to log auto-approval:", auditError);
  }

  return { success: true };
}

/**
 * Process document for potential auto-approval
 * Returns true if auto-approved, false otherwise
 */
export async function processAutoApproval(
  documentId: string,
  extractedData: Record<string, unknown>,
  documentType: string | null,
  classificationConfidence: number,
  extractionConfidence: number
): Promise<{
  success: boolean;
  autoApproved: boolean;
  result?: AutoApprovalResult;
  error?: string;
}> {
  // Check if document qualifies
  const checkResult = await checkAutoApproval(
    documentId,
    extractedData,
    documentType,
    classificationConfidence,
    extractionConfidence
  );

  if (!checkResult.success || !checkResult.result) {
    return { success: false, autoApproved: false, error: checkResult.error };
  }

  if (!checkResult.result.shouldAutoApprove) {
    return { success: true, autoApproved: false, result: checkResult.result };
  }

  // Auto-approve the document
  const approvalResult = await autoApproveDocument(documentId);
  if (!approvalResult.success) {
    return { success: false, autoApproved: false, error: approvalResult.error };
  }

  // Update accuracy metrics for auto-approval tracking
  await updateAutoApprovalMetrics(documentType);

  return { success: true, autoApproved: true, result: checkResult.result };
}

/**
 * Update accuracy metrics for auto-approval
 */
async function updateAutoApprovalMetrics(documentType: string | null): Promise<void> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) return;

  // Try to update existing record or insert new one
  const { data: existing } = await supabase
    .from("accuracy_metrics")
    .select("id, auto_approved_count")
    .eq("organization_id", userData.organization_id)
    .eq("date", today)
    .eq("document_type", documentType || "all")
    .single();

  if (existing) {
    await supabase
      .from("accuracy_metrics")
      .update({
        auto_approved_count: (existing.auto_approved_count || 0) + 1,
      })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("accuracy_metrics")
      .insert({
        organization_id: userData.organization_id,
        date: today,
        document_type: documentType || "all",
        auto_approved_count: 1,
        total_documents: 1,
      });
  }
}

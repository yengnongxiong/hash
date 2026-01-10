"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createVerificationCode,
  verifyCodeAndCreateSession,
  logoutAdminSession,
  isAdminSessionValid,
} from "@/lib/admin/auth";
import { sendAdminVerificationCode } from "@/lib/email/resend";

// Send verification code to admin email
export async function sendVerificationCode(): Promise<{ success: boolean; error?: string }> {
  const { code, error } = await createVerificationCode();

  if (error || !code) {
    return { success: false, error: error || "Failed to create code" };
  }

  // Send email
  const emailResult = await sendAdminVerificationCode(code);

  if (!emailResult.success) {
    return { success: false, error: emailResult.error };
  }

  return { success: true };
}

// Verify code and create session
export async function verifyCode(code: string): Promise<{ success: boolean; error?: string }> {
  const result = await verifyCodeAndCreateSession(code);

  if (result.success) {
    revalidatePath("/admin");
  }

  return result;
}

// Logout from admin
export async function logoutAdmin(): Promise<void> {
  await logoutAdminSession();
  revalidatePath("/admin");
}

// Create system alert (admin only)
export async function createSystemAlertAdmin(formData: FormData) {
  const supabase = await createClient();

  // Verify admin session
  const isValid = await isAdminSessionValid();
  if (!isValid) {
    return { error: "Admin session expired" };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const title = formData.get("title") as string;
  const message = formData.get("message") as string;
  const alertType = formData.get("alertType") as string;
  const startsAt = formData.get("startsAt") as string;
  const endsAt = formData.get("endsAt") as string | null;
  const isGlobal = formData.get("isGlobal") === "true";
  const targetOrgsJson = formData.get("targetOrganizations") as string;

  if (!title || !message) {
    return { error: "Title and message are required" };
  }

  const validAlertTypes = ["info", "warning", "maintenance", "critical"] as const;
  const alertTypeValue = validAlertTypes.includes(alertType as typeof validAlertTypes[number])
    ? (alertType as typeof validAlertTypes[number])
    : "info";

  let targetOrgIds: string[] = [];
  if (!isGlobal && targetOrgsJson) {
    try {
      targetOrgIds = JSON.parse(targetOrgsJson);
    } catch {
      // Ignore parse errors
    }
  }

  const { data, error } = await supabase
    .from("system_alerts")
    .insert({
      organization_id: null, // Admin creates org-independent alerts
      created_by: user.id,
      alert_type: alertTypeValue,
      title,
      message,
      starts_at: startsAt || new Date().toISOString(),
      ends_at: endsAt || null,
      target_organization_ids: isGlobal ? [] : targetOrgIds,
      active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating alert:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/alerts");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { alert: data };
}

// Update system alert (admin only)
export async function updateSystemAlertAdmin(
  alertId: string,
  updates: {
    title?: string;
    message?: string;
    alertType?: string;
    active?: boolean;
    endsAt?: string | null;
    isGlobal?: boolean;
    targetOrganizations?: string[];
  }
) {
  const supabase = await createClient();

  // Verify admin session
  const isValid = await isAdminSessionValid();
  if (!isValid) {
    return { error: "Admin session expired" };
  }

  const updateData: Record<string, unknown> = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.message !== undefined) updateData.message = updates.message;
  if (updates.active !== undefined) updateData.active = updates.active;
  if (updates.endsAt !== undefined) updateData.ends_at = updates.endsAt;
  if (updates.targetOrganizations !== undefined) {
    updateData.target_organization_ids = updates.isGlobal ? [] : updates.targetOrganizations;
  }
  if (updates.alertType !== undefined) {
    const validAlertTypes = ["info", "warning", "maintenance", "critical"] as const;
    if (validAlertTypes.includes(updates.alertType as typeof validAlertTypes[number])) {
      updateData.alert_type = updates.alertType;
    }
  }

  const { error } = await supabase
    .from("system_alerts")
    .update(updateData)
    .eq("id", alertId);

  if (error) {
    console.error("Error updating alert:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/alerts");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { success: true };
}

// Delete system alert (admin only)
export async function deleteSystemAlertAdmin(alertId: string) {
  const supabase = await createClient();

  // Verify admin session
  const isValid = await isAdminSessionValid();
  if (!isValid) {
    return { error: "Admin session expired" };
  }

  const { error } = await supabase
    .from("system_alerts")
    .delete()
    .eq("id", alertId);

  if (error) {
    console.error("Error deleting alert:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/alerts");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { success: true };
}

// Update organization AI settings (admin only)
export async function updateOrganizationAISettingsAdmin(
  organizationId: string,
  settings: {
    highConfidenceThreshold: number;
    mediumConfidenceThreshold: number;
    lowConfidenceThreshold: number;
    autoApprovalEnabled: boolean;
    autoApprovalMinConfidence: number;
    autoApprovalRequireNoFlags: boolean;
    amountAnomalyThreshold: number;
    enableDuplicateDetection: boolean;
    duplicateSimilarityThreshold: number;
    autoRetrainEnabled: boolean;
    retrainCorrectionThreshold: number;
    retrainAccuracyThreshold: number;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Verify admin session
  const isValid = await isAdminSessionValid();
  if (!isValid) {
    return { success: false, error: "Admin session expired" };
  }

  const updateData = {
    organization_id: organizationId,
    high_confidence_threshold: settings.highConfidenceThreshold,
    medium_confidence_threshold: settings.mediumConfidenceThreshold,
    low_confidence_threshold: settings.lowConfidenceThreshold,
    auto_approval_enabled: settings.autoApprovalEnabled,
    auto_approval_min_confidence: settings.autoApprovalMinConfidence,
    auto_approval_require_no_flags: settings.autoApprovalRequireNoFlags,
    amount_anomaly_threshold: settings.amountAnomalyThreshold,
    enable_duplicate_detection: settings.enableDuplicateDetection,
    duplicate_similarity_threshold: settings.duplicateSimilarityThreshold,
    auto_retrain_enabled: settings.autoRetrainEnabled,
    retrain_correction_threshold: settings.retrainCorrectionThreshold,
    retrain_accuracy_threshold: settings.retrainAccuracyThreshold,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("organization_ai_settings")
    .upsert(updateData, { onConflict: "organization_id" });

  if (error) {
    console.error("Error updating AI settings:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/ai-settings");
  return { success: true };
}

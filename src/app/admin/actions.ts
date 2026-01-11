"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  logoutAdminSession,
  isAdminSessionValid,
} from "@/lib/admin/auth";
import type { Json } from "@/types/database";

// Helper function to generate a 6-char alphanumeric code
function generateOrgCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create a new organization (admin only)
export async function createOrganizationAdmin(
  name: string
): Promise<{ organization?: { name: string; org_code: string | null }; error?: string }> {
  // Verify admin session
  const isValid = await isAdminSessionValid();
  if (!isValid) {
    return { error: "Admin session expired" };
  }

  if (!name || name.trim().length < 2) {
    return { error: "Organization name must be at least 2 characters" };
  }

  const adminClient = createAdminClient();

  // Generate a unique org code (retry if collision)
  let orgCode = generateOrgCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const { data: existing } = await adminClient
      .from("organizations")
      .select("id")
      .eq("org_code", orgCode)
      .single();

    if (!existing) break;

    orgCode = generateOrgCode();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    return { error: "Failed to generate unique organization code. Please try again." };
  }

  // Create the organization
  const { data: org, error } = await adminClient
    .from("organizations")
    .insert({
      name: name.trim(),
      org_code: orgCode,
      settings: { businessType: "general" },
    })
    .select("id, name, org_code")
    .single();

  if (error) {
    console.error("Error creating organization:", error);
    return { error: error.message };
  }

  // Log the action
  await logAdminActivity("org_created", "organization", org.id || "", org.name);

  revalidatePath("/admin/organizations");
  return { organization: org };
}

// Regenerate organization code (admin only)
export async function regenerateOrganizationCodeAdmin(
  organizationId: string
): Promise<{ newCode?: string; error?: string }> {
  // Verify admin session
  const isValid = await isAdminSessionValid();
  if (!isValid) {
    return { error: "Admin session expired" };
  }

  const adminClient = createAdminClient();

  // Generate a unique org code (retry if collision)
  let orgCode = generateOrgCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const { data: existing } = await adminClient
      .from("organizations")
      .select("id")
      .eq("org_code", orgCode)
      .single();

    if (!existing) break;

    orgCode = generateOrgCode();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    return { error: "Failed to generate unique organization code. Please try again." };
  }

  // Update the organization
  const { error } = await adminClient
    .from("organizations")
    .update({ org_code: orgCode })
    .eq("id", organizationId);

  if (error) {
    console.error("Error regenerating organization code:", error);
    return { error: error.message };
  }

  // Log the action
  await logAdminActivity("code_regenerated", "organization", organizationId, undefined, { new_code: orgCode });

  revalidatePath("/admin/organizations");
  return { newCode: orgCode };
}

// Logout from admin
export async function logoutAdmin(): Promise<void> {
  await logoutAdminSession();
  revalidatePath("/admin");
}

// Create system alert (admin only)
export async function createSystemAlertAdmin(formData: FormData) {
  // Verify admin session
  const isValid = await isAdminSessionValid();
  if (!isValid) {
    return { error: "Admin session expired" };
  }

  const adminClient = createAdminClient();

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

  const { data, error } = await adminClient
    .from("system_alerts")
    .insert({
      organization_id: null, // Admin creates org-independent alerts
      created_by: null, // System admin (no Supabase user)
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

  // Log the action
  await logAdminActivity("alert_created", "alert", data.id, title);

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
  // Verify admin session
  const isValid = await isAdminSessionValid();
  if (!isValid) {
    return { error: "Admin session expired" };
  }

  const adminClient = createAdminClient();

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

  const { error } = await adminClient
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
  // Verify admin session
  const isValid = await isAdminSessionValid();
  if (!isValid) {
    return { error: "Admin session expired" };
  }

  const adminClient = createAdminClient();

  // Get alert info for logging
  const { data: alert } = await adminClient
    .from("system_alerts")
    .select("title")
    .eq("id", alertId)
    .single();

  const { error } = await adminClient
    .from("system_alerts")
    .delete()
    .eq("id", alertId);

  if (error) {
    console.error("Error deleting alert:", error);
    return { error: error.message };
  }

  // Log the action
  await logAdminActivity("alert_deleted", "alert", alertId, alert?.title || "Unknown");

  revalidatePath("/admin/alerts");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { success: true };
}

// Log admin activity
async function logAdminActivity(
  actionType: string,
  entityType?: string,
  entityId?: string,
  entityName?: string,
  metadata?: Json
) {
  const adminClient = createAdminClient();
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@hash.app";

  await adminClient.from("admin_activity_log").insert({
    action_type: actionType,
    actor_email: ADMIN_EMAIL,
    entity_type: entityType || null,
    entity_id: entityId || null,
    entity_name: entityName || null,
    metadata: metadata || null,
  });
}

// Delete user (admin only)
export async function deleteUserAdmin(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const isValid = await isAdminSessionValid();
  if (!isValid) {
    return { success: false, error: "Admin session expired" };
  }

  const adminClient = createAdminClient();
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

  // Get user info before deletion for logging
  const { data: user } = await adminClient
    .from("users")
    .select("email, name, organization_id")
    .eq("id", userId)
    .single();

  if (!user) {
    return { success: false, error: "User not found" };
  }

  // Prevent deleting admin
  if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return { success: false, error: "Cannot delete admin user" };
  }

  // Set foreign keys to NULL (uploaded_by, created_by, etc.)
  await adminClient.from("documents").update({ uploaded_by: null }).eq("uploaded_by", userId);
  await adminClient.from("documents").update({ approved_by: null }).eq("approved_by", userId);
  await adminClient.from("whiteboard_tasks").update({ assigned_to: null }).eq("assigned_to", userId);
  await adminClient.from("whiteboard_tasks").update({ created_by: null }).eq("created_by", userId);
  await adminClient.from("whiteboard_tasks").update({ updated_by: null }).eq("updated_by", userId);
  await adminClient.from("appointments").update({ created_by: null }).eq("created_by", userId);
  await adminClient.from("appointments").update({ updated_by: null }).eq("updated_by", userId);
  await adminClient.from("customers").update({ created_by: null }).eq("created_by", userId);
  await adminClient.from("customers").update({ updated_by: null }).eq("updated_by", userId);

  // Delete from users table
  const { error: deleteError } = await adminClient
    .from("users")
    .delete()
    .eq("id", userId);

  if (deleteError) {
    console.error("Error deleting user from users table:", deleteError);
    return { success: false, error: deleteError.message };
  }

  // Delete from Supabase Auth
  const { error: authError } = await adminClient.auth.admin.deleteUser(userId);

  if (authError) {
    console.error("Error deleting user from auth:", authError);
    // User is already deleted from users table, log but don't fail
  }

  // Log the action
  await logAdminActivity("user_deleted", "user", userId, user.name || user.email);

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { success: true };
}

// Reset database (admin only) - DANGEROUS
export async function resetDatabaseAdmin(
  confirmationText: string
): Promise<{ success: boolean; error?: string }> {
  const isValid = await isAdminSessionValid();
  if (!isValid) {
    return { success: false, error: "Admin session expired" };
  }

  if (confirmationText !== "DELETE ALL DATA") {
    return { success: false, error: "Confirmation text did not match" };
  }

  const adminClient = createAdminClient();
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

  // Get admin user ID to preserve
  const { data: adminUser } = await adminClient
    .from("users")
    .select("id")
    .eq("email", ADMIN_EMAIL)
    .maybeSingle();

  const adminUserId = adminUser?.id;

  try {
    // Delete in order (respecting foreign keys):
    // 1. Document-related data
    await adminClient.from("document_audit_log").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("document_flags").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("document_dates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("document_versions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("document_embeddings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("document_queue").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("field_corrections").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("anomaly_detections").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("entity_matches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("experiment_results").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("processing_metrics").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("documents").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 2. Task-related data
    await adminClient.from("task_subtasks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("task_attachments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("whiteboard_tasks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("task_recommendations").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 3. People/customer data
    await adminClient.from("customer_tag_assignments").delete().neq("customer_id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("appointments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("customers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("person_tags").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("appointment_types").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 4. Activity and alerts
    await adminClient.from("activity_log").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("system_alerts").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 5. Settings and policies
    await adminClient.from("organization_ai_settings").delete().neq("organization_id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("retention_jobs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("retention_policies").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("validation_rules").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("known_entities").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("accuracy_metrics").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 6. ML/training data
    await adminClient.from("model_experiments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("training_batches").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 7. Users (except admin)
    if (adminUserId) {
      await adminClient.from("users").delete().neq("id", adminUserId);
    }

    // Delete from Supabase Auth (except admin)
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    for (const authUser of authUsers?.users || []) {
      if (authUser.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        await adminClient.auth.admin.deleteUser(authUser.id);
      }
    }

    // 8. Organizations
    await adminClient.from("organizations").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Log the action
    await logAdminActivity("database_reset", undefined, undefined, undefined, {
      preserved_admin_email: ADMIN_EMAIL,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/users");
    revalidatePath("/admin/organizations");
    return { success: true };
  } catch (error) {
    console.error("Error resetting database:", error);
    return { success: false, error: "Failed to reset database" };
  }
}

// Get admin activity log
export async function getAdminActivityLog(limit: number = 50) {
  const isValid = await isAdminSessionValid();
  if (!isValid) {
    return { error: "Admin session expired" };
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("admin_activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching admin activity log:", error);
    return { error: error.message };
  }

  return { activities: data };
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
  // Verify admin session
  const isValid = await isAdminSessionValid();
  if (!isValid) {
    return { success: false, error: "Admin session expired" };
  }

  const adminClient = createAdminClient();

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

  const { error } = await adminClient
    .from("organization_ai_settings")
    .upsert(updateData, { onConflict: "organization_id" });

  if (error) {
    console.error("Error updating AI settings:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/ai-settings");
  return { success: true };
}

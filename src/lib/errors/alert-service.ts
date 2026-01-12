"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ProcessingError, ErrorCategory, logProcessingError } from "./document-processing";

/**
 * Map error categories to system alert types
 */
function mapErrorToAlertType(category: ErrorCategory): "error" | "warning" | "info" {
  switch (category) {
    case "authentication":
    case "invalid_document":
    case "ocr_failed":
    case "extraction_failed":
    case "storage_failed":
      return "error";
    case "network":
    case "timeout":
    case "rate_limit":
      return "warning";
    default:
      return "error";
  }
}

/**
 * Determine if an error should create a system alert
 * Only critical categories that require admin attention
 */
function shouldCreateAlert(category: ErrorCategory): boolean {
  const alertCategories: ErrorCategory[] = [
    "authentication",
    "storage_failed",
    "ocr_failed",
    "extraction_failed",
  ];
  return alertCategories.includes(category);
}

/**
 * Alert on processing error - logs and optionally creates system alert
 */
export async function alertOnProcessingError(
  error: ProcessingError,
  context: {
    documentId?: string;
    userId?: string;
    organizationId?: string;
    operation?: string;
  }
): Promise<{ success: boolean; alertId?: string; error?: string }> {
  // Always log the error
  logProcessingError(error, context);

  // Create system alert for critical errors
  if (!shouldCreateAlert(error.category)) {
    return { success: true };
  }

  try {
    const supabase = createAdminClient();

    const alertTitle = `Processing Error: ${error.code}`;
    const alertMessage = `${error.userMessage}\n\nDetails: ${error.message}`;

    const { data, error: insertError } = await supabase
      .from("system_alerts")
      .insert({
        title: alertTitle,
        message: alertMessage,
        alert_type: mapErrorToAlertType(error.category),
        organization_id: context.organizationId || null,
        active: true,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to create system alert:", insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true, alertId: data?.id };
  } catch (err) {
    console.error("Exception creating system alert:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Create a system alert directly (not from a ProcessingError)
 */
export async function createSystemAlert(
  title: string,
  message: string,
  alertType: "error" | "warning" | "info",
  organizationId?: string
): Promise<{ success: boolean; alertId?: string; error?: string }> {
  try {
    const supabase = createAdminClient();

    const { data, error: insertError } = await supabase
      .from("system_alerts")
      .insert({
        title,
        message,
        alert_type: alertType,
        organization_id: organizationId || null,
        active: true,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to create system alert:", insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true, alertId: data?.id };
  } catch (err) {
    console.error("Exception creating system alert:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Dismiss a system alert
 */
export async function dismissSystemAlert(
  alertId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("system_alerts")
      .update({ active: false })
      .eq("id", alertId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

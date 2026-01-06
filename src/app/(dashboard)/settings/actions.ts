"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Dismisses a system alert for the current user
 * This adds the user's ID to the dismissed_by array, not delete the alert
 */
export async function dismissAlert(alertId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    // Get current alert
    const { data: alert, error: fetchError } = await supabase
      .from("system_alerts")
      .select("dismissed_by")
      .eq("id", alertId)
      .single();

    if (fetchError) {
      return { error: "Alert not found" };
    }

    // Add user to dismissed_by array
    const currentDismissed = alert.dismissed_by || [];
    if (currentDismissed.includes(user.id)) {
      return { success: true }; // Already dismissed
    }

    const { error: updateError } = await supabase
      .from("system_alerts")
      .update({
        dismissed_by: [...currentDismissed, user.id],
      })
      .eq("id", alertId);

    if (updateError) {
      return { error: "Failed to dismiss alert" };
    }

    revalidatePath("/");
    return { success: true };
  } catch {
    return { error: "An unexpected error occurred" };
  }
}

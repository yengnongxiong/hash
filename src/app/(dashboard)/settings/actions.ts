"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const profileSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .transform((val) => val.trim()),
});

/**
 * Updates the current user's profile
 * Changes to name will reflect everywhere in the app (tasks, dates, activity, etc.)
 * because all displays fetch names dynamically via user ID joins
 */
export async function updateProfile(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    // Parse and validate input
    const rawData = {
      name: formData.get("name") as string,
    };

    const result = profileSchema.safeParse(rawData);
    if (!result.success) {
      return { error: result.error.issues[0].message };
    }

    // Update user profile
    const { error: updateError } = await supabase
      .from("users")
      .update({
        name: result.data.name,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update profile:", updateError);
      return { error: "Failed to update profile" };
    }

    // Revalidate all paths to refresh displays across the app
    // This ensures the new name shows in header, tasks, dates, activity feed, etc.
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    console.error("Profile update error:", error);
    return { error: "An unexpected error occurred" };
  }
}

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

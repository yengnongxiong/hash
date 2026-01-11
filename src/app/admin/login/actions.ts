"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { ADMIN_EMAIL, APP_URL } from "@/lib/constants";

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Send magic link to admin email
export async function sendAdminMagicLink(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const result = emailSchema.safeParse({ email });
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  // Verify this is the admin email
  if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return { success: false, error: "Invalid admin email" };
  }

  const supabase = await createClient();

  // Send magic link with redirect to admin callback
  const { error } = await supabase.auth.signInWithOtp({
    email: ADMIN_EMAIL,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${APP_URL}/auth/callback?next=/admin&admin=true`,
    },
  });

  if (error) {
    console.error("Failed to send admin magic link:", error);
    return { success: false, error: "Failed to send verification email" };
  }

  return { success: true };
}

// Get admin email for display
export async function getAdminEmailForLogin(): Promise<string> {
  return ADMIN_EMAIL;
}

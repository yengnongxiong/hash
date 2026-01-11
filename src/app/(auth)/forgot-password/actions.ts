"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "yengnongxiong@gmail.com";

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function sendPasswordResetEmail(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const result = emailSchema.safeParse({ email });
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  // Admin users cannot reset password (password is in env)
  if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return {
      success: false,
      error: "Admin accounts cannot reset passwords. Please contact support.",
    };
  }

  const supabase = await createClient();

  // Get the app URL for redirect
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset-password`,
  });

  if (error) {
    console.error("Failed to send password reset email:", error);
    // Don't reveal if email exists or not for security
    return { success: true }; // Always return success to prevent email enumeration
  }

  return { success: true };
}

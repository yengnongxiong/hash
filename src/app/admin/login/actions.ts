"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { z } from "zod";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "yengnongxiong@gmail.com";
const ADMIN_SESSION_COOKIE = "admin_session_id";
const SESSION_DURATION_HOURS = 1; // 60 minutes = 1 hour

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Send OTP to admin email using Supabase magic link
export async function sendAdminOTP(
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

  // Use Supabase OTP (email magic link)
  const { error } = await supabase.auth.signInWithOtp({
    email: ADMIN_EMAIL,
    options: {
      // This will send an OTP code that can be verified
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error("Failed to send admin OTP:", error);
    return { success: false, error: "Failed to send verification email" };
  }

  return { success: true };
}

// Verify OTP and create admin session
export async function verifyAdminOTP(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  // Verify this is the admin email
  if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return { success: false, error: "Invalid admin email" };
  }

  if (!token || token.length !== 6) {
    return { success: false, error: "Please enter a valid 6-digit code" };
  }

  const supabase = await createClient();

  // Verify OTP with Supabase
  const { data: authData, error } = await supabase.auth.verifyOtp({
    email: ADMIN_EMAIL,
    token,
    type: "email",
  });

  if (error) {
    console.error("Failed to verify admin OTP:", error);
    return { success: false, error: "Invalid or expired code" };
  }

  if (!authData.user) {
    return { success: false, error: "Authentication failed" };
  }

  // Create admin session
  const adminClient = createAdminClient();
  const sessionExpiresAt = new Date(
    Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000
  );

  const { data: session, error: sessionError } = await adminClient
    .from("admin_sessions")
    .insert({
      user_id: authData.user.id,
      expires_at: sessionExpiresAt.toISOString(),
    })
    .select()
    .single();

  if (sessionError || !session) {
    console.error("Failed to create admin session:", sessionError);
    return { success: false, error: "Failed to create session" };
  }

  // Set session cookie
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: sessionExpiresAt,
    path: "/",
  });

  // Log admin login
  await adminClient.from("admin_activity_log").insert({
    action_type: "admin_login_otp",
    actor_email: ADMIN_EMAIL,
    metadata: { session_id: session.id, method: "supabase_otp" },
  });

  return { success: true };
}

// Get admin email for display
export async function getAdminEmailForLogin(): Promise<string> {
  return ADMIN_EMAIL;
}

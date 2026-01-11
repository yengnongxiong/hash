"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminVerificationCode } from "@/lib/email/resend";
import { cookies } from "next/headers";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "yengnongxiong@gmail.com";
const ADMIN_SESSION_COOKIE = "admin_session_id";
const SESSION_DURATION_HOURS = 24;
const CODE_EXPIRY_MINUTES = 10;

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check if user is logged in as the admin email
export async function isAdminEmail(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  return user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

// Check if admin has a valid 2FA session
export async function isAdminSessionValid(): Promise<boolean> {
  // First check if user is logged in as admin email
  const isAdmin = await isAdminEmail();
  if (!isAdmin) {
    return false;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  // Check for valid admin session cookie
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!sessionId) {
    return false;
  }

  // Verify session in database
  const adminClient = createAdminClient();
  const { data: session } = await adminClient
    .from("admin_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .single();

  return !!session;
}

// Check if visitor is an admin with valid 2FA session
export async function isAdminUser(): Promise<{ isAdmin: boolean; needs2FA: boolean }> {
  const isAdmin = await isAdminEmail();
  if (!isAdmin) {
    return { isAdmin: false, needs2FA: false };
  }

  const hasValidSession = await isAdminSessionValid();
  return { isAdmin: true, needs2FA: !hasValidSession };
}

// Send verification code to admin email
export async function sendAdminCode(): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await isAdminEmail();
  if (!isAdmin) {
    return { success: false, error: "Not authorized" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const adminClient = createAdminClient();
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate any existing unused codes for this email
  await adminClient
    .from("admin_verification_codes")
    .update({ used: true })
    .eq("email", ADMIN_EMAIL)
    .eq("used", false);

  // Create new verification code
  const { error: insertError } = await adminClient
    .from("admin_verification_codes")
    .insert({
      email: ADMIN_EMAIL,
      code,
      expires_at: expiresAt.toISOString(),
      used: false,
    });

  if (insertError) {
    console.error("Failed to create verification code:", insertError);
    return { success: false, error: "Failed to create verification code" };
  }

  // Send email
  const { success, error } = await sendAdminVerificationCode(code);
  if (!success) {
    return { success: false, error: error || "Failed to send verification email" };
  }

  return { success: true };
}

// Verify the code and create admin session
export async function verifyAdminCode(code: string): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await isAdminEmail();
  if (!isAdmin) {
    return { success: false, error: "Not authorized" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const adminClient = createAdminClient();

  // Find valid verification code
  const { data: verificationCode } = await adminClient
    .from("admin_verification_codes")
    .select("*")
    .eq("email", ADMIN_EMAIL)
    .eq("code", code)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!verificationCode) {
    return { success: false, error: "Invalid or expired code" };
  }

  // Mark code as used
  await adminClient
    .from("admin_verification_codes")
    .update({ used: true })
    .eq("id", verificationCode.id);

  // Create admin session
  const sessionExpiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
  const { data: session, error: sessionError } = await adminClient
    .from("admin_sessions")
    .insert({
      user_id: user.id,
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
    action_type: "admin_login",
    actor_email: ADMIN_EMAIL,
    metadata: { session_id: session.id },
  });

  return { success: true };
}

// Logout from admin session
export async function logoutAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (sessionId) {
    const adminClient = createAdminClient();

    // Delete session from database
    await adminClient
      .from("admin_sessions")
      .delete()
      .eq("id", sessionId);

    // Log admin logout
    await adminClient.from("admin_activity_log").insert({
      action_type: "admin_logout",
      actor_email: ADMIN_EMAIL,
      metadata: { session_id: sessionId },
    });
  }

  // Clear cookie
  cookieStore.delete(ADMIN_SESSION_COOKIE);

  // Also sign out of Supabase
  const supabase = await createClient();
  await supabase.auth.signOut();
}

// Clean up expired sessions and codes (can be called periodically)
export async function cleanupExpiredAdminData(): Promise<void> {
  const adminClient = createAdminClient();
  const now = new Date().toISOString();

  // Delete expired sessions
  await adminClient
    .from("admin_sessions")
    .delete()
    .lt("expires_at", now);

  // Delete expired verification codes
  await adminClient
    .from("admin_verification_codes")
    .delete()
    .lt("expires_at", now);
}

// Get admin email (wrapper function since server actions can only export async functions)
export async function getAdminEmail(): Promise<string> {
  return ADMIN_EMAIL;
}

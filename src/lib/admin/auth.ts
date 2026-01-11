"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "yengnongxiong@gmail.com";
const ADMIN_SESSION_COOKIE = "admin_session_id";
const SESSION_DURATION_HOURS = 1; // 60 minutes

// Check if user is logged in as the admin email
export async function isAdminEmail(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  return user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

// Check if admin has a valid session
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

// Check if visitor is an admin with valid session
export async function isAdminUser(): Promise<{ isAdmin: boolean; needs2FA: boolean }> {
  const isAdmin = await isAdminEmail();
  if (!isAdmin) {
    return { isAdmin: false, needs2FA: false };
  }

  const hasValidSession = await isAdminSessionValid();
  return { isAdmin: true, needs2FA: !hasValidSession };
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

// Clean up expired sessions (can be called periodically)
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

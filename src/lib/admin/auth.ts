import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "yengnongxiong@gmail.com";
const ADMIN_SESSION_COOKIE = "admin_session_id";
const CODE_EXPIRY_MINUTES = 10;
const SESSION_EXPIRY_HOURS = 24;

// Generate a 6-digit numeric code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check if the current user is the admin
export async function isAdminUser(): Promise<{ isAdmin: boolean; userId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { isAdmin: false };
  }

  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  return { isAdmin, userId: user.id };
}

// Create a new verification code
export async function createVerificationCode(): Promise<{ code?: string; error?: string }> {
  const supabase = await createClient();

  // Check if user is admin
  const { isAdmin } = await isAdminUser();
  if (!isAdmin) {
    return { error: "Unauthorized" };
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

  // Delete any existing unused codes for this email
  await supabase
    .from("admin_verification_codes")
    .delete()
    .eq("email", ADMIN_EMAIL)
    .eq("used", false);

  // Create new code
  const { error } = await supabase
    .from("admin_verification_codes")
    .insert({
      email: ADMIN_EMAIL,
      code,
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    console.error("Error creating verification code:", error);
    return { error: "Failed to create verification code" };
  }

  return { code };
}

// Verify a code and create admin session
export async function verifyCodeAndCreateSession(
  inputCode: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Check if user is admin
  const { isAdmin, userId } = await isAdminUser();
  if (!isAdmin || !userId) {
    return { success: false, error: "Unauthorized" };
  }

  // Find valid code
  const { data: codeData, error: findError } = await supabase
    .from("admin_verification_codes")
    .select("*")
    .eq("email", ADMIN_EMAIL)
    .eq("code", inputCode)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (findError || !codeData) {
    return { success: false, error: "Invalid or expired code" };
  }

  // Mark code as used
  await supabase
    .from("admin_verification_codes")
    .update({ used: true })
    .eq("id", codeData.id);

  // Create admin session
  const sessionExpiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

  const { data: session, error: sessionError } = await supabase
    .from("admin_sessions")
    .insert({
      user_id: userId,
      expires_at: sessionExpiresAt.toISOString(),
    })
    .select()
    .single();

  if (sessionError || !session) {
    console.error("Error creating admin session:", sessionError);
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

  return { success: true };
}

// Check if admin session is valid
export async function isAdminSessionValid(): Promise<boolean> {
  const supabase = await createClient();

  // Check if user is admin
  const { isAdmin, userId } = await isAdminUser();
  if (!isAdmin || !userId) {
    return false;
  }

  // Get session cookie
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!sessionId) {
    return false;
  }

  // Verify session exists and is not expired
  const { data: session, error } = await supabase
    .from("admin_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !session) {
    // Clear invalid session cookie
    cookieStore.delete(ADMIN_SESSION_COOKIE);
    return false;
  }

  return true;
}

// Logout from admin session
export async function logoutAdminSession(): Promise<void> {
  const supabase = await createClient();

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (sessionId) {
    // Delete session from database
    await supabase
      .from("admin_sessions")
      .delete()
      .eq("id", sessionId);

    // Clear cookie
    cookieStore.delete(ADMIN_SESSION_COOKIE);
  }
}

export { ADMIN_EMAIL };

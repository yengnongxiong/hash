"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies, headers } from "next/headers";
import crypto from "crypto";

const DEVICE_VERIFICATION_COOKIE = "device_verification_pending";
const TRUSTED_DEVICE_DAYS = 30;

// Generate device fingerprint from request headers
export async function generateDeviceId(): Promise<string> {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";
  // Create a hash from user agent - this is a simple fingerprint
  const hash = crypto
    .createHash("sha256")
    .update(userAgent)
    .digest("hex")
    .substring(0, 32);
  return hash;
}

// Get device name from user agent
export async function getDeviceName(): Promise<string> {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "Unknown device";

  // Parse user agent to get readable device name
  if (userAgent.includes("iPhone")) return "iPhone";
  if (userAgent.includes("iPad")) return "iPad";
  if (userAgent.includes("Android")) return "Android Device";
  if (userAgent.includes("Mac OS")) {
    if (userAgent.includes("Chrome")) return "Chrome on Mac";
    if (userAgent.includes("Safari")) return "Safari on Mac";
    if (userAgent.includes("Firefox")) return "Firefox on Mac";
    return "Mac";
  }
  if (userAgent.includes("Windows")) {
    if (userAgent.includes("Chrome")) return "Chrome on Windows";
    if (userAgent.includes("Firefox")) return "Firefox on Windows";
    if (userAgent.includes("Edge")) return "Edge on Windows";
    return "Windows PC";
  }
  if (userAgent.includes("Linux")) {
    if (userAgent.includes("Chrome")) return "Chrome on Linux";
    if (userAgent.includes("Firefox")) return "Firefox on Linux";
    return "Linux";
  }

  return "Unknown Device";
}

// Check if device is trusted for a user
export async function isDeviceTrusted(userId: string): Promise<boolean> {
  const adminClient = createAdminClient();
  const deviceId = await generateDeviceId();

  const { data: device } = await adminClient
    .from("trusted_devices")
    .select("id")
    .eq("user_id", userId)
    .eq("device_id", deviceId)
    .eq("is_active", true)
    .single();

  return !!device;
}

// Check if there's a pending device verification
export async function hasPendingVerification(): Promise<{
  pending: boolean;
  userId?: string;
  email?: string;
  deviceId?: string;
}> {
  const cookieStore = await cookies();
  const pendingData = cookieStore.get(DEVICE_VERIFICATION_COOKIE)?.value;

  if (!pendingData) {
    return { pending: false };
  }

  try {
    const parsed = JSON.parse(pendingData);
    return {
      pending: true,
      userId: parsed.userId,
      email: parsed.email,
      deviceId: parsed.deviceId,
    };
  } catch {
    return { pending: false };
  }
}

// Start device verification - send OTP via Supabase
export async function startDeviceVerification(
  userId: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const deviceId = await generateDeviceId();

  // Use Supabase's built-in OTP email system
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false, // User already exists
    },
  });

  if (error) {
    console.error("Failed to send verification email:", error);
    return { success: false, error: "Failed to send verification email" };
  }

  // Set pending verification cookie
  const cookieStore = await cookies();
  cookieStore.set(
    DEVICE_VERIFICATION_COOKIE,
    JSON.stringify({ userId, email, deviceId }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60, // 10 minutes
      path: "/",
    }
  );

  return { success: true };
}

// Verify device code and register as trusted
export async function verifyDeviceCode(
  code: string
): Promise<{ success: boolean; error?: string }> {
  const pending = await hasPendingVerification();
  if (!pending.pending || !pending.userId || !pending.email || !pending.deviceId) {
    return { success: false, error: "No pending verification" };
  }

  const supabase = await createClient();

  // Verify OTP with Supabase
  const { error } = await supabase.auth.verifyOtp({
    email: pending.email,
    token: code,
    type: "email",
  });

  if (error) {
    console.error("Failed to verify OTP:", error);
    return { success: false, error: "Invalid or expired code" };
  }

  // Get user agent for storing
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || null;
  const deviceName = await getDeviceName();

  // Register device as trusted
  const adminClient = createAdminClient();
  const { error: deviceError } = await adminClient.from("trusted_devices").insert({
    user_id: pending.userId,
    device_id: pending.deviceId,
    device_name: deviceName,
    user_agent: userAgent,
    is_active: true,
  });

  if (deviceError) {
    // If device already exists (race condition), just update it
    if (deviceError.code === "23505") {
      await adminClient
        .from("trusted_devices")
        .update({
          is_active: true,
          last_used_at: new Date().toISOString(),
          device_name: deviceName,
        })
        .eq("user_id", pending.userId)
        .eq("device_id", pending.deviceId);
    } else {
      console.error("Failed to register trusted device:", deviceError);
      return { success: false, error: "Failed to register device" };
    }
  }

  // Clear pending verification cookie
  const cookieStore = await cookies();
  cookieStore.delete(DEVICE_VERIFICATION_COOKIE);

  return { success: true };
}

// Resend verification code via Supabase OTP
export async function resendDeviceVerificationCode(): Promise<{
  success: boolean;
  error?: string;
}> {
  const pending = await hasPendingVerification();
  if (!pending.pending || !pending.userId || !pending.email) {
    return { success: false, error: "No pending verification" };
  }

  return startDeviceVerification(pending.userId, pending.email);
}

// Update device last used timestamp
export async function updateDeviceLastUsed(userId: string): Promise<void> {
  const adminClient = createAdminClient();
  const deviceId = await generateDeviceId();

  await adminClient
    .from("trusted_devices")
    .update({ last_used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("device_id", deviceId);
}

// Revoke current device trust (called on logout)
export async function revokeCurrentDevice(): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false };
  }

  const adminClient = createAdminClient();
  const deviceId = await generateDeviceId();

  await adminClient
    .from("trusted_devices")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("device_id", deviceId);

  return { success: true };
}

// Get user's trusted devices
export async function getUserTrustedDevices(): Promise<{
  devices: Array<{
    id: string;
    device_name: string | null;
    last_used_at: string | null;
    created_at: string | null;
    is_current: boolean;
  }>;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { devices: [], error: "Not authenticated" };
  }

  const currentDeviceId = await generateDeviceId();

  const { data: devices, error } = await supabase
    .from("trusted_devices")
    .select("id, device_name, last_used_at, created_at, device_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("last_used_at", { ascending: false, nullsFirst: false });

  if (error) {
    return { devices: [], error: error.message };
  }

  return {
    devices: (devices || []).map((d) => ({
      id: d.id,
      device_name: d.device_name,
      last_used_at: d.last_used_at,
      created_at: d.created_at,
      is_current: d.device_id === currentDeviceId,
    })),
  };
}

// Revoke a trusted device by ID
export async function revokeTrustedDevice(
  deviceId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("trusted_devices")
    .update({ is_active: false })
    .eq("id", deviceId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Clean up expired device data (can be called periodically)
export async function cleanupExpiredDeviceData(): Promise<void> {
  const adminClient = createAdminClient();

  // Deactivate devices not used in 30 days
  const thirtyDaysAgo = new Date(
    Date.now() - TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  await adminClient
    .from("trusted_devices")
    .update({ is_active: false })
    .lt("last_used_at", thirtyDaysAgo);
}

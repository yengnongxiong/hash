"use server";

import {
  resendDeviceVerificationLink,
  hasPendingVerification,
} from "@/lib/auth/device";

export async function resendVerificationLink(): Promise<{
  success: boolean;
  error?: string;
}> {
  return resendDeviceVerificationLink();
}

export async function getPendingVerificationEmail(): Promise<string | null> {
  const pending = await hasPendingVerification();
  return pending.email || null;
}

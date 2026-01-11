"use server";

import {
  verifyDeviceCode,
  resendDeviceVerificationCode,
} from "@/lib/auth/device";

export async function verifyDevice(
  code: string
): Promise<{ success?: boolean; error?: string }> {
  if (!code || code.length !== 6) {
    return { error: "Please enter a valid 6-digit code" };
  }

  const result = await verifyDeviceCode(code);

  if (!result.success) {
    return { error: result.error || "Invalid code" };
  }

  return { success: true };
}

export async function resendCode(): Promise<{
  success: boolean;
  error?: string;
}> {
  return resendDeviceVerificationCode();
}

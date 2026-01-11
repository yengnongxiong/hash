"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  isDeviceTrusted,
  startDeviceVerification,
  updateDeviceLastUsed,
} from "@/lib/auth/device";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "yengnongxiong@gmail.com";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function login(formData: FormData) {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const result = loginSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  // Admin users should use /admin/login with OTP
  if (result.data.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return {
      error: "Admin users must use the admin login portal",
      redirectTo: "/admin/login"
    };
  }

  // Regular user login via Supabase
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) {
    // Check if error is due to unverified email
    if (error.message.includes("Email not confirmed")) {
      return {
        error: "EMAIL_NOT_CONFIRMED",
        email: result.data.email,
        message: "Please confirm your email before logging in. Check your inbox for the confirmation link.",
      };
    }
    return { error: error.message };
  }

  // Check if device is trusted
  const trusted = await isDeviceTrusted(authData.user.id);

  if (!trusted) {
    // Start device verification
    const verifyResult = await startDeviceVerification(
      authData.user.id,
      authData.user.email || result.data.email
    );

    if (!verifyResult.success) {
      // If we can't send OTP, allow login but log the issue
      console.warn("Could not start device verification:", verifyResult.error);
      // Fall through to redirect to dashboard
    } else {
      // Redirect to device verification page
      redirect("/verify-device");
    }
  } else {
    // Update last used timestamp for trusted device
    await updateDeviceLastUsed(authData.user.id);
  }

  redirect("/dashboard");
}

export async function resendConfirmation(email: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { z } from "zod";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "yengnongxiong@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

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

  // Check if this is admin login
  if (result.data.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    // Admin uses ADMIN_PASSWORD instead of Supabase password
    if (!ADMIN_PASSWORD) {
      return { error: "Admin password not configured" };
    }

    if (result.data.password !== ADMIN_PASSWORD) {
      return { error: "Invalid credentials" };
    }

    // Sign in admin using Supabase with the admin password as the actual password
    const adminClient = createAdminClient();

    // Try to sign in - if it fails, we may need to create or update the user
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (signInError) {
      // Check if admin user exists
      const { data: users } = await adminClient.auth.admin.listUsers();
      const adminUser = users?.users?.find(u => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());

      if (adminUser) {
        // User exists but password is wrong - update it
        await adminClient.auth.admin.updateUserById(adminUser.id, {
          password: ADMIN_PASSWORD,
        });
      } else {
        // Create admin user
        const { error: createError } = await adminClient.auth.admin.createUser({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          email_confirm: true,
        });

        if (createError) {
          console.error("Failed to create admin user:", createError);
          return { error: "Failed to create admin user" };
        }
      }

      // Try signing in again
      const { error: retryError } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });

      if (retryError) {
        console.error("Failed to sign in admin after setup:", retryError);
        return { error: "Failed to sign in admin" };
      }
    }

    redirect("/admin");
  }

  // Regular user login via Supabase
  const { error } = await supabase.auth.signInWithPassword({
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

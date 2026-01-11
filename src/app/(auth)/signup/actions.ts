"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  orgCode: z.string().length(6, "Organization code must be 6 characters"),
});

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    name: formData.get("name") as string,
    orgCode: (formData.get("orgCode") as string)?.toUpperCase().trim(),
  };

  const result = signupSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  // 1. Validate the organization code and get the organization
  const { data: org, error: orgError } = await adminClient
    .from("organizations")
    .select("id, name, org_code")
    .eq("org_code", result.data.orgCode)
    .single();

  if (orgError || !org) {
    return { error: "Invalid organization code. Please check with your administrator." };
  }

  // 2. Check if email is already registered in users table
  const { data: existingUser } = await adminClient
    .from("users")
    .select("id")
    .eq("email", result.data.email)
    .single();

  if (existingUser) {
    return { error: "An account with this email already exists. Please sign in instead." };
  }

  // 3. Sign up the user with Supabase Auth
  // Store org info in metadata - profile will be created after email confirmation
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: {
        name: result.data.name,
        organization_id: org.id,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: "Failed to create user" };
  }

  // NOTE: User profile is NOT created here anymore.
  // It will be created in /auth/callback after email confirmation.
  // This prevents fake emails from getting into the users table.

  // Always redirect to email confirmation page
  // Users must verify their email before accessing the app
  redirect(`/signup/confirm-email?email=${encodeURIComponent(result.data.email)}`);
}

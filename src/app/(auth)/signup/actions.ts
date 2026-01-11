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

  // 2. Check if email is already registered
  const { data: existingUser } = await adminClient
    .from("users")
    .select("id")
    .eq("email", result.data.email)
    .single();

  if (existingUser) {
    return { error: "An account with this email already exists. Please sign in instead." };
  }

  // 3. Sign up the user with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: {
        name: result.data.name,
        organization_id: org.id,
      },
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: "Failed to create user" };
  }

  // 4. Create the user profile record (as member, not owner)
  const { error: userError } = await adminClient.from("users").insert({
    id: authData.user.id,
    organization_id: org.id,
    email: result.data.email,
    name: result.data.name,
    role: "member",
  });

  if (userError) {
    console.error("Failed to create user profile:", userError);
    return { error: "Account created but profile setup failed. Please contact support." };
  }

  // User created - redirect to email confirmation page
  // If no session, email confirmation is required
  if (authData.user && !authData.session) {
    redirect(`/signup/confirm-email?email=${encodeURIComponent(result.data.email)}`);
  }

  // If session exists (email auto-confirmed), go to dashboard
  redirect("/dashboard");
}

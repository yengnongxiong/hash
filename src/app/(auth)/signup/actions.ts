"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
});

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    name: formData.get("name") as string,
    organizationName: formData.get("organizationName") as string,
  };

  const result = signupSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  // 1. Create the organization first (using admin client to bypass RLS)
  const { data: org, error: orgError } = await adminClient
    .from("organizations")
    .insert({
      name: result.data.organizationName,
      settings: { businessType: "general" },
    })
    .select()
    .single();

  if (orgError) {
    return { error: "Failed to create organization: " + orgError.message };
  }

  // 2. Sign up the user with Supabase Auth
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
    // Clean up the organization if auth fails
    await adminClient.from("organizations").delete().eq("id", org.id);
    return { error: authError.message };
  }

  if (!authData.user) {
    await adminClient.from("organizations").delete().eq("id", org.id);
    return { error: "Failed to create user" };
  }

  // 3. Create the user profile record (using admin to bypass RLS during signup)
  const { error: userError } = await adminClient.from("users").insert({
    id: authData.user.id,
    organization_id: org.id,
    email: result.data.email,
    name: result.data.name,
    role: "owner",
  });

  if (userError) {
    // Note: Auth user was created but profile failed - this needs manual cleanup
    console.error("Failed to create user profile:", userError);
    return { error: "Account created but profile setup failed. Please contact support." };
  }

  // For development, auto-confirm users (in production, you'd send confirmation email)
  if (authData.user && !authData.session) {
    // User needs to confirm email
    return {
      success: true,
      message: "Please check your email to confirm your account.",
    };
  }

  redirect("/dashboard");
}

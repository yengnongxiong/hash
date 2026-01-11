"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const passwordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function updatePassword(
  password: string
): Promise<{ success: boolean; error?: string }> {
  const result = passwordSchema.safeParse({ password });
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    console.error("Failed to update password:", error);
    return { success: false, error: "Failed to update password. The link may have expired." };
  }

  return { success: true };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revokeCurrentDevice } from "@/lib/auth/device";

export async function logout() {
  const supabase = await createClient();

  // Get user before signing out for device revocation
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Revoke device trust
    await revokeCurrentDevice();
  }

  // Sign out from Supabase (this clears server-side session)
  await supabase.auth.signOut();

  // Clear any custom cookies we've set
  const cookieStore = await cookies();

  // Clear device verification cookie
  cookieStore.delete("device_verification_pending");

  // Clear admin session cookie if it exists
  cookieStore.delete("admin_session_id");

  // Clear Supabase auth cookies manually to ensure clean state
  const allCookies = cookieStore.getAll();
  for (const cookie of allCookies) {
    if (cookie.name.includes("supabase") || cookie.name.includes("sb-")) {
      cookieStore.delete(cookie.name);
    }
  }

  // Redirect to login
  redirect("/login");
}

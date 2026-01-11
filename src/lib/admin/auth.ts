import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "yengnongxiong@gmail.com";

// Check if the current user is the admin (via Supabase session)
export async function isAdminSessionValid(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  return user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

// Check if visitor is an admin
export async function isAdminUser(): Promise<{ isAdmin: boolean }> {
  const isValid = await isAdminSessionValid();
  return { isAdmin: isValid };
}

// Logout from admin session (sign out of Supabase)
export async function logoutAdminSession(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export { ADMIN_EMAIL };

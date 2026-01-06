import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile with organization
  const { data: profile } = await supabase
    .from("users")
    .select("*, organizations(name)")
    .eq("id", user.id)
    .single();

  return <DashboardShell user={profile}>{children}</DashboardShell>;
}

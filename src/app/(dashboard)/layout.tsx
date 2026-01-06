import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SystemAlert } from "@/types/database";

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

  // Fetch active system alerts
  const { data: alertsData } = await supabase
    .from("system_alerts")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  const alerts = (alertsData as SystemAlert[]) || [];

  return (
    <DashboardShell user={profile} alerts={alerts} userId={user.id}>
      {children}
    </DashboardShell>
  );
}

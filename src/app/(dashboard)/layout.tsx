import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SystemAlert } from "@/types/database";
import { isAdminSessionValid } from "@/lib/admin/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if this is an admin session - redirect admin to admin panel
  const isAdmin = await isAdminSessionValid();
  if (isAdmin) {
    redirect("/admin");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile (without organization join to avoid TypeScript issues)
  const { data: userProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch organization separately if user has one
  let organization: { name: string } | null = null;
  if (userProfile?.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", userProfile.organization_id)
      .single();
    organization = org;
  }

  // Construct profile with organization
  const profile = userProfile ? {
    email: userProfile.email,
    name: userProfile.name,
    organizations: organization,
  } : null;

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

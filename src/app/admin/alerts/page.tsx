import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminSessionValid } from "@/lib/admin/auth";
import { AdminAlertsManager } from "@/components/admin/admin-alerts-manager";
import { SystemAlert, Organization } from "@/types/database";

export default async function AdminAlertsPage() {
  // Check if admin session is valid
  const isVerified = await isAdminSessionValid();

  if (!isVerified) {
    redirect("/admin/verify");
  }

  const supabase = await createClient();

  // Fetch all alerts
  const { data: alerts } = await supabase
    .from("system_alerts")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch all organizations for targeting
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name")
    .order("name");

  return (
    <AdminAlertsManager
      alerts={(alerts as SystemAlert[]) || []}
      organizations={(organizations as Pick<Organization, "id" | "name">[]) || []}
    />
  );
}

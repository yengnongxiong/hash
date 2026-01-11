import { createAdminClient } from "@/lib/supabase/admin";
import { AdminAlertsManager } from "@/components/admin/admin-alerts-manager";
import { SystemAlert, Organization } from "@/types/database";

export default async function AdminAlertsPage() {
  // Note: Admin session validation is handled by the (protected) layout
  const supabase = createAdminClient();

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

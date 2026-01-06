import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminSessionValid } from "@/lib/admin/auth";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default async function AdminPage() {
  // Check if admin session is valid
  const isVerified = await isAdminSessionValid();

  if (!isVerified) {
    redirect("/admin/verify");
  }

  const supabase = await createClient();

  // Fetch stats
  const [
    { count: userCount },
    { count: orgCount },
    { count: customerCount },
    { count: documentCount },
    { count: alertCount },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("organizations").select("*", { count: "exact", head: true }),
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase.from("documents").select("*", { count: "exact", head: true }),
    supabase.from("system_alerts").select("*", { count: "exact", head: true }).eq("active", true),
  ]);

  // Fetch recent activity
  const { data: recentUsers } = await supabase
    .from("users")
    .select("id, email, name, role, created_at, organizations(name)")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: recentDocuments } = await supabase
    .from("documents")
    .select("id, file_name, status, document_type, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <AdminDashboard
      stats={{
        users: userCount || 0,
        organizations: orgCount || 0,
        customers: customerCount || 0,
        documents: documentCount || 0,
        activeAlerts: alertCount || 0,
      }}
      recentUsers={recentUsers || []}
      recentDocuments={recentDocuments || []}
    />
  );
}

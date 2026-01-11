import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminSessionValid } from "@/lib/admin/auth";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default async function AdminPage() {
  // Check if admin session is valid
  const isVerified = await isAdminSessionValid();

  if (!isVerified) {
    redirect("/login");
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

  // Fetch all organizations with usage stats
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, org_code")
    .order("created_at", { ascending: false });

  // Build org usage data
  const orgUsage = await Promise.all(
    (organizations || []).map(async (org) => {
      const [
        { count: userCount },
        { count: peopleCount },
        { count: documentCount },
        { count: taskCount },
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }).eq("organization_id", org.id),
        supabase.from("customers").select("*", { count: "exact", head: true }).eq("organization_id", org.id),
        supabase.from("documents").select("*", { count: "exact", head: true }).eq("organization_id", org.id),
        supabase.from("whiteboard_tasks").select("*", { count: "exact", head: true }).eq("organization_id", org.id),
      ]);

      return {
        id: org.id,
        name: org.name,
        org_code: org.org_code,
        userCount: userCount || 0,
        peopleCount: peopleCount || 0,
        documentCount: documentCount || 0,
        taskCount: taskCount || 0,
      };
    })
  );

  // Fetch recent activity - users without organization join
  const { data: rawUsers } = await supabase
    .from("users")
    .select("id, email, name, role, created_at, organization_id")
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch organizations for users
  const orgIds = [...new Set((rawUsers || []).filter(u => u.organization_id).map(u => u.organization_id as string))];
  let orgsMap: Record<string, { name: string }> = {};

  if (orgIds.length > 0) {
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", orgIds);

    if (orgs) {
      orgsMap = Object.fromEntries(orgs.map(o => [o.id, { name: o.name }]));
    }
  }

  // Attach organizations to users
  const recentUsers = (rawUsers || []).map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || "member",
    created_at: user.created_at,
    organizations: user.organization_id ? orgsMap[user.organization_id] || null : null,
  }));

  const { data: rawDocuments } = await supabase
    .from("documents")
    .select("id, file_name, status, document_type, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  // Transform documents to ensure status is not null
  const recentDocuments = (rawDocuments || []).map(doc => ({
    id: doc.id,
    file_name: doc.file_name,
    status: doc.status || "pending",
    document_type: doc.document_type,
    created_at: doc.created_at,
  }));

  return (
    <AdminDashboard
      stats={{
        users: userCount || 0,
        organizations: orgCount || 0,
        customers: customerCount || 0,
        documents: documentCount || 0,
        activeAlerts: alertCount || 0,
      }}
      recentUsers={recentUsers}
      recentDocuments={recentDocuments}
      orgUsage={orgUsage}
    />
  );
}

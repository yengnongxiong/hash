import { createAdminClient } from "@/lib/supabase/admin";
import { Users } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { UsersList } from "@/components/admin/users-list";
import { ADMIN_EMAIL } from "@/lib/constants";

export default async function AdminUsersPage() {
  // Use admin client to bypass RLS and see all users
  // Note: Admin session validation is handled by the (protected) layout
  const supabase = createAdminClient();

  const { data: rawUsers } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch organizations separately
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
  const users = (rawUsers || []).map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || "member",
    created_at: user.created_at,
    organizations: user.organization_id ? orgsMap[user.organization_id] || null : null,
  }));

  return (
    <AdminPageWrapper
      title="Users"
      description="All registered users"
      icon={<Users className="h-5 w-5 text-blue-500" />}
      iconBg="bg-blue-500/10"
    >
      <UsersList users={users} adminEmail={ADMIN_EMAIL} />
    </AdminPageWrapper>
  );
}

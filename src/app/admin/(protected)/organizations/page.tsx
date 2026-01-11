import { createAdminClient } from "@/lib/supabase/admin";
import { Building2 } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { CreateOrganizationDialog } from "@/components/admin/create-organization-dialog";
import { OrganizationsList } from "@/components/admin/organizations-list";

export default async function AdminOrganizationsPage() {
  // Use admin client to bypass RLS and see all organizations
  // Note: Admin session validation is handled by the (protected) layout
  const supabase = createAdminClient();

  // Fetch organizations with counts
  const { data: organizations } = await supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });

  // Get user counts per organization
  const orgStats = await Promise.all(
    (organizations || []).map(async (org) => {
      const [
        { count: userCount },
        { count: customerCount },
        { count: documentCount },
      ] = await Promise.all([
        supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id),
        supabase
          .from("customers")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id),
        supabase
          .from("documents")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id),
      ]);

      return {
        id: org.id,
        name: org.name,
        org_code: org.org_code,
        created_at: org.created_at,
        userCount: userCount || 0,
        customerCount: customerCount || 0,
        documentCount: documentCount || 0,
      };
    })
  );

  return (
    <AdminPageWrapper
      title="Organizations"
      description="Manage organizations and invite codes"
      icon={<Building2 className="h-5 w-5 text-purple-500" />}
      iconBg="bg-purple-500/10"
      headerAction={<CreateOrganizationDialog />}
    >
      <OrganizationsList organizations={orgStats} />
    </AdminPageWrapper>
  );
}

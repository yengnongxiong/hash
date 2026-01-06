import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminSessionValid } from "@/lib/admin/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, FileText, UserCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";

export default async function AdminOrganizationsPage() {
  const isVerified = await isAdminSessionValid();
  if (!isVerified) {
    redirect("/admin/verify");
  }

  const supabase = await createClient();

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
        ...org,
        userCount: userCount || 0,
        customerCount: customerCount || 0,
        documentCount: documentCount || 0,
      };
    })
  );

  return (
    <AdminPageWrapper
      title="Organizations"
      description="All registered organizations"
      icon={<Building2 className="h-5 w-5 text-purple-500" />}
      iconBg="bg-purple-500/10"
    >
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">{orgStats.length} Organizations</CardTitle>
          <CardDescription className="text-slate-400">
            All registered organizations and their usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orgStats.map((org) => (
              <div
                key={org.id}
                className="p-4 rounded-lg bg-slate-700/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{org.name}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        Created {format(new Date(org.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-slate-400">Users:</span>
                    <Badge variant="secondary">{org.userCount}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <UserCircle className="h-4 w-4 text-cyan-500" />
                    <span className="text-slate-400">Customers:</span>
                    <Badge variant="secondary">{org.customerCount}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-green-500" />
                    <span className="text-slate-400">Documents:</span>
                    <Badge variant="secondary">{org.documentCount}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AdminPageWrapper>
  );
}

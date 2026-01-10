import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminSessionValid } from "@/lib/admin/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, ArrowLeft, Shield, Search, Building2, Clock } from "lucide-react";
import { format } from "date-fns";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";

export default async function AdminUsersPage() {
  const isVerified = await isAdminSessionValid();
  if (!isVerified) {
    redirect("/admin/verify");
  }

  const supabase = await createClient();

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
    ...user,
    organizations: user.organization_id ? orgsMap[user.organization_id] || null : null,
  }));

  return (
    <AdminPageWrapper
      title="Users"
      description="All registered users"
      icon={<Users className="h-5 w-5 text-blue-500" />}
      iconBg="bg-blue-500/10"
    >
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">{users?.length || 0} Users</CardTitle>
              <CardDescription className="text-slate-400">
                All registered users across organizations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users?.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-600 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {(user.name || user.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-white">{user.name || "No name"}</p>
                    <p className="text-sm text-slate-400">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-slate-500" />
                      <span className="text-sm text-slate-400">
                        {user.organizations?.name || "No organization"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span className="text-xs text-slate-500">
                        {format(new Date(user.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant={user.role === "owner" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {user.role}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AdminPageWrapper>
  );
}

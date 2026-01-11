import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminSessionValid } from "@/lib/admin/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, User, Building2, Bell, Trash2, RefreshCw, Database } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import type { Json } from "@/types/database";

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  user_deleted: { label: "User Deleted", icon: <Trash2 className="h-4 w-4" />, color: "bg-red-500/10 text-red-400" },
  org_created: { label: "Org Created", icon: <Building2 className="h-4 w-4" />, color: "bg-purple-500/10 text-purple-400" },
  code_regenerated: { label: "Code Regenerated", icon: <RefreshCw className="h-4 w-4" />, color: "bg-cyan-500/10 text-cyan-400" },
  alert_created: { label: "Alert Created", icon: <Bell className="h-4 w-4" />, color: "bg-orange-500/10 text-orange-400" },
  alert_deleted: { label: "Alert Deleted", icon: <Bell className="h-4 w-4" />, color: "bg-red-500/10 text-red-400" },
  database_reset: { label: "Database Reset", icon: <Database className="h-4 w-4" />, color: "bg-red-500/10 text-red-400" },
};

interface ActivityLog {
  id: string;
  action_type: string;
  actor_email: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  metadata: Json | null;
  created_at: string | null;
}

export default async function AdminActivityPage() {
  const isVerified = await isAdminSessionValid();
  if (!isVerified) {
    redirect("/login");
  }

  const adminClient = createAdminClient();

  const { data: activities } = await adminClient
    .from("admin_activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <AdminPageWrapper
      title="Activity Log"
      description="Audit trail of admin actions"
      icon={<History className="h-5 w-5 text-green-500" />}
      iconBg="bg-green-500/10"
    >
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">{(activities || []).length} Actions</CardTitle>
          <CardDescription className="text-slate-400">
            Recent admin actions on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(activities || []).map((activity: ActivityLog) => {
              const config = ACTION_CONFIG[activity.action_type] || {
                label: activity.action_type,
                icon: <History className="h-4 w-4" />,
                color: "bg-slate-500/10 text-slate-400",
              };

              return (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${config.color.split(" ")[0]}`}>
                      {config.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={config.color}>
                          {config.label}
                        </Badge>
                        {activity.entity_name && (
                          <span className="text-sm text-white">{activity.entity_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-3 w-3 text-slate-500" />
                        <span className="text-xs text-slate-500">{activity.actor_email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {activity.created_at && (
                      <>
                        <p className="text-sm text-slate-400">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(activity.created_at), "MMM d, yyyy HH:mm")}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {(!activities || activities.length === 0) && (
              <div className="text-center py-8 text-slate-400">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No activity yet</p>
                <p className="text-sm">Admin actions will appear here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </AdminPageWrapper>
  );
}

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { SystemAlertsManager } from "@/components/settings/system-alerts-manager";
import { SystemAlert } from "@/types/database";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch user profile without organization join
  const { data: userProfile } = user
    ? await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single()
    : { data: null };

  // Fetch organization separately if user has one
  let organization: { name: string; settings: unknown } | null = null;
  if (userProfile?.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name, settings")
      .eq("id", userProfile.organization_id)
      .single();
    organization = org;
  }

  // Construct profile with organizations
  const profile = userProfile ? {
    ...userProfile,
    organizations: organization,
  } : null;

  // Fetch active system alerts for all users (read-only)
  const { data: alertsData } = await supabase
    .from("system_alerts")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  const alerts = (alertsData as SystemAlert[]) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and organization settings
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-sm">{profile?.name || "Not set"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-sm">{profile?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <p className="text-sm capitalize">{profile?.role}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>Your organization details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Organization Name</label>
              <p className="text-sm">{profile?.organizations?.name || "Not set"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Business Type</label>
              <p className="text-sm capitalize">
                {(profile?.organizations?.settings as { businessType?: string })?.businessType || "General"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Notices - Read-only for all users */}
      <SystemAlertsManager alerts={alerts} />

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>Additional settings will be added here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>More settings coming soon</p>
            <p className="text-sm">Including team management, billing, and API keys</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

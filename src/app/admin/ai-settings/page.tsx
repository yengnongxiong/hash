import { redirect } from "next/navigation";
import { isAdminSessionValid } from "@/lib/admin/auth";
import { AISettingsManager } from "@/components/admin/ai-settings-manager";
import { createClient } from "@/lib/supabase/server";

export default async function AISettingsPage() {
  // Check if admin session is valid
  const isVerified = await isAdminSessionValid();

  if (!isVerified) {
    redirect("/admin/verify");
  }

  const supabase = await createClient();

  // Fetch all organizations with their AI settings
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name")
    .order("name");

  // Fetch AI settings for all organizations
  const { data: aiSettings } = await supabase
    .from("organization_ai_settings")
    .select("*");

  // Map settings by organization ID
  type AISetting = NonNullable<typeof aiSettings>[number];
  const settingsMap: Record<string, AISetting> = {};
  if (aiSettings) {
    for (const setting of aiSettings) {
      if (setting.organization_id) {
        settingsMap[setting.organization_id] = setting;
      }
    }
  }

  // Combine organizations with their settings
  const orgsWithSettings = (organizations || []).map(org => ({
    ...org,
    settings: settingsMap[org.id] || null,
  }));

  // Fetch global stats
  const [
    { count: totalDocuments },
    { count: pendingReview },
    { count: autoApproved },
    { count: totalCorrections },
  ] = await Promise.all([
    supabase.from("documents").select("*", { count: "exact", head: true }),
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("document_audit_log").select("*", { count: "exact", head: true }).eq("action", "auto_approved"),
    supabase.from("field_corrections").select("*", { count: "exact", head: true }),
  ]);

  return (
    <AISettingsManager
      organizations={orgsWithSettings}
      stats={{
        totalDocuments: totalDocuments || 0,
        pendingReview: pendingReview || 0,
        autoApproved: autoApproved || 0,
        totalCorrections: totalCorrections || 0,
      }}
    />
  );
}

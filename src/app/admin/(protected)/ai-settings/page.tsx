import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminSessionValid } from "@/lib/admin/auth";
import { AISettingsManager } from "@/components/admin/ai-settings-manager";

export default async function AdminAISettingsPage() {
  const isVerified = await isAdminSessionValid();
  if (!isVerified) {
    redirect("/login");
  }

  const supabase = createAdminClient();

  // Fetch organizations
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name")
    .order("name");

  // Fetch AI settings for each organization
  const orgsWithSettings = await Promise.all(
    (organizations || []).map(async (org) => {
      const { data: settings } = await supabase
        .from("organization_ai_settings")
        .select("*")
        .eq("organization_id", org.id)
        .single();
      return { ...org, settings };
    })
  );

  // Fetch global stats
  const [totalDocs, pendingReview, autoApproved, corrections] = await Promise.all([
    supabase.from("documents").select("*", { count: "exact", head: true }),
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_review"),
    supabase
      .from("document_audit_log")
      .select("*", { count: "exact", head: true })
      .eq("action", "auto_approved"),
    supabase.from("field_corrections").select("*", { count: "exact", head: true }),
  ]);

  return (
    <AISettingsManager
      organizations={orgsWithSettings}
      stats={{
        totalDocuments: totalDocs.count || 0,
        pendingReview: pendingReview.count || 0,
        autoApproved: autoApproved.count || 0,
        totalCorrections: corrections.count || 0,
      }}
    />
  );
}

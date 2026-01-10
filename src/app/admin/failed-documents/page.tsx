import { redirect } from "next/navigation";
import { isAdminSessionValid } from "@/lib/admin/auth";
import { FailedDocumentsManager } from "@/components/admin/failed-documents-manager";
import { createClient } from "@/lib/supabase/server";

export default async function FailedDocumentsPage() {
  // Check if admin session is valid
  const isVerified = await isAdminSessionValid();

  if (!isVerified) {
    redirect("/admin/verify");
  }

  const supabase = await createClient();

  // Fetch failed documents with organization info
  const { data: failedDocuments } = await supabase
    .from("documents")
    .select(`
      id,
      document_number,
      file_name,
      file_type,
      file_size,
      file_url,
      status,
      extracted_data,
      created_at,
      updated_at,
      organization_id,
      organizations(name)
    `)
    .eq("status", "failed")
    .order("updated_at", { ascending: false });

  // Get retry counts from audit log
  const documentIds = failedDocuments?.map((d) => d.id) || [];
  let retryCounts: Record<string, number> = {};

  if (documentIds.length > 0) {
    const { data: retryLogs } = await supabase
      .from("document_audit_log")
      .select("document_id")
      .in("document_id", documentIds)
      .eq("action", "ocr_retry");

    if (retryLogs) {
      retryCounts = retryLogs.reduce((acc, log) => {
        acc[log.document_id] = (acc[log.document_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }
  }

  // Add retry count to documents and ensure proper types
  const documentsWithRetryCounts = (failedDocuments || []).map((doc) => ({
    id: doc.id,
    document_number: doc.document_number,
    file_name: doc.file_name || "",
    file_type: doc.file_type,
    file_size: doc.file_size,
    file_url: doc.file_url,
    status: doc.status || "failed",
    created_at: doc.created_at || "",
    updated_at: doc.updated_at || "",
    organization_id: doc.organization_id,
    organizations: doc.organizations,
    retryCount: retryCounts[doc.id] || 0,
    errorInfo: doc.extracted_data as {
      error?: string;
      errorCode?: string;
      errorCategory?: string;
      isRetryable?: boolean;
    } | null,
  }));

  // Get stats
  const { count: totalFailed } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("status", "failed");

  const { count: totalProcessing } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("status", "processing");

  // Group by error category
  const errorCategories = documentsWithRetryCounts.reduce((acc, doc) => {
    const category = doc.errorInfo?.errorCategory || "unknown";
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <FailedDocumentsManager
      documents={documentsWithRetryCounts}
      stats={{
        totalFailed: totalFailed || 0,
        totalProcessing: totalProcessing || 0,
        errorCategories,
      }}
    />
  );
}

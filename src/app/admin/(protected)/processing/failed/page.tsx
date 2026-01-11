import { createAdminClient } from "@/lib/supabase/admin";
import { FailedDocumentsManager } from "@/components/admin/failed-documents-manager";

export default async function AdminFailedDocumentsPage() {
  // Note: Admin session validation is handled by the (protected) layout
  const supabase = createAdminClient();

  // Get failed documents with organization info
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
      created_at,
      updated_at,
      organization_id,
      extracted_data,
      organizations(name)
    `)
    .eq("status", "failed")
    .order("updated_at", { ascending: false });

  // Get retry counts from audit log
  const documentIds = (failedDocuments || []).map(d => d.id);
  const { data: retryCounts } = documentIds.length > 0
    ? await supabase
        .from("document_audit_log")
        .select("document_id")
        .in("document_id", documentIds)
        .eq("action", "ocr_retry")
    : { data: [] };

  // Count retries per document
  const retryCountMap: Record<string, number> = {};
  (retryCounts || []).forEach(r => {
    retryCountMap[r.document_id] = (retryCountMap[r.document_id] || 0) + 1;
  });

  // Get stats
  const [
    { count: totalFailed },
    { count: totalProcessing },
  ] = await Promise.all([
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("status", "processing"),
  ]);

  // Calculate error categories
  const errorCategories: Record<string, number> = {};
  (failedDocuments || []).forEach(doc => {
    const extractedData = doc.extracted_data as Record<string, unknown> | null;
    const category = (extractedData?.errorCategory as string) || "unknown";
    errorCategories[category] = (errorCategories[category] || 0) + 1;
  });

  // Transform documents for the component
  const transformedDocuments = (failedDocuments || []).map(doc => {
    const extractedData = doc.extracted_data as Record<string, unknown> | null;
    return {
      id: doc.id,
      document_number: doc.document_number,
      file_name: doc.file_name,
      file_type: doc.file_type,
      file_size: doc.file_size,
      file_url: doc.file_url,
      status: doc.status || "failed",
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      organization_id: doc.organization_id,
      organizations: doc.organizations as { name: string } | null,
      retryCount: retryCountMap[doc.id] || 0,
      errorInfo: extractedData ? {
        error: extractedData.error as string | undefined,
        errorCode: extractedData.errorCode as string | undefined,
        errorCategory: extractedData.errorCategory as string | undefined,
        isRetryable: extractedData.isRetryable as boolean | undefined,
      } : null,
    };
  });

  return (
    <FailedDocumentsManager
      documents={transformedDocuments}
      stats={{
        totalFailed: totalFailed || 0,
        totalProcessing: totalProcessing || 0,
        errorCategories,
      }}
    />
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, History, CheckCircle, User, Bot } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentPreview } from "@/components/documents/document-preview";
import { ExtractedDataView } from "@/components/documents/extracted-data-view";
import { ProcessingStatus } from "@/components/documents/processing-status";
import { DocumentAuditLog } from "@/components/documents/document-audit-log";
import { DocumentFlagsWrapper } from "@/components/documents/document-flags-wrapper";
import { DocumentApproval } from "@/components/documents/document-approval";
import { RetryButton } from "@/components/documents/retry-button";
import { DuplicateWarning } from "@/components/documents/duplicate-warning";
import { DocumentVersionHistory } from "@/components/documents/document-version-history";
import { SimilarDocuments } from "@/components/documents/similar-documents";
import { formatDistanceToNow, formatFileSize } from "@/lib/utils/format";
import { logDocumentView, getDocumentAuditLog, getDocumentFlags } from "../actions";
import { getDocumentVersions } from "./actions";

interface DocumentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentDetailPage({
  params,
}: DocumentDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: document, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  // Fetch linked customer if exists
  let linkedCustomer: { id: string; name: string; company: string | null } | null = null;
  if (document?.customer_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id, name, company")
      .eq("id", document.customer_id)
      .single();
    linkedCustomer = customer;
  }

  if (error || !document) {
    notFound();
  }

  // Log document view
  await logDocumentView(id);

  // Fetch audit log, flags, and versions
  const [auditLogData, flags, versions] = await Promise.all([
    getDocumentAuditLog(id),
    getDocumentFlags(id),
    getDocumentVersions(id),
  ]);
  const { logs: auditLogs, total: auditLogTotal } = auditLogData;

  const isProcessing = document.status === "processing";
  const isFailed = document.status === "failed";
  const isPendingReview = document.status === "pending_review";
  const isCompleted = document.status === "completed";
  const unresolvedFlags = flags.filter((f) => !f.resolved);
  const hasUnresolvedFlags = unresolvedFlags.length > 0;

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b mb-4 gap-3">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link href="/documents" className="shrink-0">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold truncate">{document.file_name}</h1>
              {document.document_number && (
                <Badge variant="outline" className="font-mono text-xs">
                  {document.document_number}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
              <span>{formatFileSize(document.file_size || 0)}</span>
              <span className="hidden sm:inline">•</span>
              <span>Uploaded {formatDistanceToNow(new Date(document.created_at))}</span>
              {linkedCustomer && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="basis-full sm:basis-auto">
                    Linked to {linkedCustomer.name}
                    {linkedCustomer.company && ` (${linkedCustomer.company})`}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ProcessingStatus status={document.status as "pending" | "processing" | "pending_review" | "completed" | "failed" | "rejected"} />
          {isPendingReview && (
            <DocumentApproval documentId={document.id} hasUnresolvedFlags={hasUnresolvedFlags} unresolvedFlagCount={unresolvedFlags.length} />
          )}
          {isCompleted && (
            <Badge variant={document.approved_by ? "default" : "secondary"} className="flex items-center gap-1">
              {document.approved_by ? (
                <>
                  <User className="h-3 w-3" />
                  Manually Approved
                </>
              ) : (
                <>
                  <Bot className="h-3 w-3" />
                  Auto-Approved
                </>
              )}
              {document.approved_at && (
                <span className="ml-1 opacity-70">
                  {formatDistanceToNow(new Date(document.approved_at))}
                </span>
              )}
            </Badge>
          )}
          <a href={document.file_url} download={document.file_name}>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </a>
        </div>
      </div>

      {/* Processing State */}
      {isProcessing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-600 border-t-transparent" />
            <span className="text-yellow-800 font-medium">
              Processing document with OCR...
            </span>
          </div>
          <p className="text-yellow-700 text-sm mt-1">
            This may take a few moments. The page will update automatically when complete.
          </p>
        </div>
      )}

      {/* Pending Review State */}
      {isPendingReview && (
        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-purple-600" />
            <span className="text-purple-800 dark:text-purple-200 font-medium">
              Review Required
            </span>
          </div>
          <p className="text-purple-700 dark:text-purple-300 text-sm mt-1">
            Review the extracted data below and make any corrections before approving.
            {hasUnresolvedFlags && (
              <span className="block mt-1 font-medium">
                Note: This document has unresolved flags that should be reviewed.
              </span>
            )}
          </p>
        </div>
      )}

      {/* Failed State */}
      {isFailed && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-destructive font-medium">
                OCR processing failed
              </span>
              <p className="text-destructive/80 text-sm mt-1">
                {(document.extracted_data as Record<string, unknown>)?.error as string ||
                  "An unknown error occurred during processing"}
              </p>
            </div>
            <RetryButton
              documentId={document.id}
              hasExtractedData={!!document.extracted_data}
            />
          </div>
        </div>
      )}

      {/* Duplicate Detection Warning */}
      <DuplicateWarning documentId={document.id} status={document.status || ""} />

      {/* Split View - 3 columns */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Left: Document Preview */}
        <div className="overflow-hidden rounded-lg border bg-background min-h-[300px] lg:min-h-0">
          <div className="p-2 border-b bg-muted/30">
            <h2 className="text-sm font-medium">Original Document</h2>
          </div>
          <div className="h-[250px] lg:h-[calc(100%-2.5rem)] p-2">
            <DocumentPreview
              fileUrl={document.file_url}
              fileType={document.file_type}
              fileName={document.file_name}
            />
          </div>
        </div>

        {/* Middle: Extracted Data */}
        <div className="overflow-auto rounded-lg border bg-background">
          <div className="p-2 border-b bg-muted/30">
            <h2 className="text-sm font-medium">Extracted Data</h2>
          </div>
          <div className="p-4">
            {(isCompleted || isPendingReview) ? (
              <ExtractedDataView
                documentId={document.id}
                documentType={document.document_type}
                rawText={document.raw_text}
                extractedData={document.extracted_data}
              />
            ) : isProcessing ? (
              <div className="flex items-center justify-center h-full py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Extracting data from document...
                  </p>
                </div>
              </div>
            ) : isFailed ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No data extracted due to processing error</p>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Waiting for processing to start...</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Flags, Versions & Activity Log */}
        <div className="overflow-auto rounded-lg border bg-background">
          <div className="p-2 border-b bg-muted/30 flex items-center gap-2">
            <History className="h-4 w-4" />
            <h2 className="text-sm font-medium">Flags & Activity</h2>
          </div>
          <div className="p-4 space-y-4">
            <DocumentFlagsWrapper documentId={document.id} initialFlags={flags} />
            <DocumentVersionHistory
              documentId={document.id}
              versions={versions}
              currentExtractedData={(document.extracted_data || {}) as Record<string, unknown>}
            />
            {(isCompleted || isPendingReview) && (
              <SimilarDocuments documentId={document.id} />
            )}
            <DocumentAuditLog documentId={document.id} initialLogs={auditLogs} initialTotal={auditLogTotal} />
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Trash2, RotateCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { DocumentPreview } from "@/components/documents/document-preview";
import { ExtractedDataView } from "@/components/documents/extracted-data-view";
import { ProcessingStatus } from "@/components/documents/processing-status";
import { formatDistanceToNow, formatFileSize } from "@/lib/utils/format";

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
    .select("*, customers(id, name, company)")
    .eq("id", id)
    .single();

  if (error || !document) {
    notFound();
  }

  const isProcessing = document.status === "processing";
  const isFailed = document.status === "failed";
  const isCompleted = document.status === "completed";

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b mb-4">
        <div className="flex items-center gap-4">
          <Link href="/documents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{document.file_name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{formatFileSize(document.file_size || 0)}</span>
              <span>•</span>
              <span>Uploaded {formatDistanceToNow(new Date(document.created_at))}</span>
              {document.customers && (
                <>
                  <span>•</span>
                  <span>
                    Linked to {document.customers.name}
                    {document.customers.company && ` (${document.customers.company})`}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ProcessingStatus status={document.status} />
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
            <form action={`/documents/${id}/retry`} method="POST">
              <Button variant="outline" size="sm">
                <RotateCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Split View */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* Left: Document Preview */}
        <div className="overflow-hidden rounded-lg border bg-background">
          <div className="p-2 border-b bg-muted/30">
            <h2 className="text-sm font-medium">Original Document</h2>
          </div>
          <div className="h-[calc(100%-2.5rem)] p-2">
            <DocumentPreview
              fileUrl={document.file_url}
              fileType={document.file_type}
              fileName={document.file_name}
            />
          </div>
        </div>

        {/* Right: Extracted Data */}
        <div className="overflow-auto rounded-lg border bg-background">
          <div className="p-2 border-b bg-muted/30">
            <h2 className="text-sm font-medium">Extracted Data</h2>
          </div>
          <div className="p-4">
            {isCompleted ? (
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
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  RotateCw,
  Trash2,
  ExternalLink,
  FileText,
  Clock,
  Server,
  Zap,
  ShieldX,
  HelpCircle,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatDistanceToNow, formatFileSize } from "@/lib/utils/format";
import { retryDocumentOCR, deleteDocuments } from "@/app/(dashboard)/documents/actions";

interface FailedDocument {
  id: string;
  document_number: string | null;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  file_url: string;
  status: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
  organizations: { name: string } | null;
  retryCount: number;
  errorInfo: {
    error?: string;
    errorCode?: string;
    errorCategory?: string;
    isRetryable?: boolean;
  } | null;
}

interface FailedDocumentsManagerProps {
  documents: FailedDocument[];
  stats: {
    totalFailed: number;
    totalProcessing: number;
    errorCategories: Record<string, number>;
  };
}

const categoryIcons: Record<string, React.ReactNode> = {
  network: <Server className="h-4 w-4" />,
  timeout: <Clock className="h-4 w-4" />,
  rate_limit: <Zap className="h-4 w-4" />,
  api: <ShieldX className="h-4 w-4" />,
  unknown: <HelpCircle className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  network: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  timeout: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  rate_limit: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  api: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  unknown: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export function FailedDocumentsManager({ documents, stats }: FailedDocumentsManagerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === documents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(documents.map((d) => d.id)));
    }
  };

  const handleRetry = (documentId: string) => {
    startTransition(async () => {
      const result = await retryDocumentOCR(documentId);
      if (result.success) {
        toast.success("Reprocessing started");
        router.refresh();
      } else {
        toast.error("Retry failed", { description: result.error });
      }
    });
  };

  const handleBulkRetry = () => {
    if (selected.size === 0) return;

    startTransition(async () => {
      let successCount = 0;
      let errorCount = 0;

      for (const docId of selected) {
        const result = await retryDocumentOCR(docId);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Started reprocessing ${successCount} document(s)`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to retry ${errorCount} document(s)`);
      }

      setSelected(new Set());
      router.refresh();
    });
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;

    startTransition(async () => {
      const result = await deleteDocuments(Array.from(selected), true);
      if (result.error) {
        toast.error("Delete failed", { description: result.error });
      } else {
        toast.success(`Deleted ${result.count} document(s)`);
        setSelected(new Set());
        router.refresh();
      }
    });
  };

  const retryableCount = documents.filter(
    (d) => d.errorInfo?.isRetryable !== false
  ).length;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                  Failed Documents Queue
                </h1>
                <p className="text-sm text-muted-foreground">
                  Review and retry failed document processing
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Failed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.totalFailed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Currently Processing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.totalProcessing}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Retryable</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{retryableCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Non-Retryable</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-600">
                {documents.length - retryableCount}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Categories */}
        {Object.keys(stats.errorCategories).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Errors by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.errorCategories).map(([category, count]) => (
                  <Badge
                    key={category}
                    variant="secondary"
                    className={categoryColors[category] || categoryColors.unknown}
                  >
                    {categoryIcons[category] || categoryIcons.unknown}
                    <span className="ml-1 capitalize">{category}</span>
                    <span className="ml-1">({count})</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Selection Actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Button size="sm" onClick={handleBulkRetry} disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RotateCw className="h-4 w-4 mr-1" />
              )}
              Retry All
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={isPending}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selected.size} document(s)?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the selected documents and their files. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Document List */}
        {documents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
              <h3 className="font-medium">No failed documents</h3>
              <p className="text-sm text-muted-foreground mt-1">
                All documents are processing successfully
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-hidden bg-background">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="w-10 p-3">
                    <Checkbox
                      checked={selected.size === documents.length && documents.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left p-3 text-sm font-medium">Document</th>
                  <th className="text-left p-3 text-sm font-medium">Organization</th>
                  <th className="text-left p-3 text-sm font-medium">Error</th>
                  <th className="text-left p-3 text-sm font-medium">Retries</th>
                  <th className="text-left p-3 text-sm font-medium">Failed At</th>
                  <th className="w-32 p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/30">
                    <td className="p-3">
                      <Checkbox
                        checked={selected.has(doc.id)}
                        onCheckedChange={() => toggleSelect(doc.id)}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate max-w-[200px]">
                            {doc.file_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {doc.document_number || doc.id.substring(0, 8)} -{" "}
                            {formatFileSize(doc.file_size || 0)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-sm">{doc.organizations?.name || "-"}</td>
                    <td className="p-3">
                      <div className="space-y-1">
                        <Badge
                          variant="secondary"
                          className={
                            categoryColors[doc.errorInfo?.errorCategory || "unknown"] ||
                            categoryColors.unknown
                          }
                        >
                          {categoryIcons[doc.errorInfo?.errorCategory || "unknown"]}
                          <span className="ml-1 capitalize">
                            {doc.errorInfo?.errorCategory || "Unknown"}
                          </span>
                        </Badge>
                        <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                          {doc.errorInfo?.error || "Unknown error"}
                        </p>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{doc.retryCount}</Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(doc.updated_at))}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {doc.errorInfo?.isRetryable !== false && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRetry(doc.id)}
                            disabled={isPending}
                            title="Retry processing"
                          >
                            {isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Link href={`/documents/${doc.id}`} target="_blank">
                          <Button variant="ghost" size="icon" title="View document">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

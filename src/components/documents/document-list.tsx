"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FileText, Trash2, RotateCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ProcessingStatus } from "./processing-status";
import { deleteDocuments, retryDocumentOCR } from "@/app/(dashboard)/documents/actions";
import { toast } from "sonner";
import { formatDistanceToNow, formatFileSize } from "@/lib/utils/format";
import type { Document } from "@/types/database";

type DocumentStatus = "pending" | "processing" | "pending_review" | "completed" | "failed" | "rejected";

interface DocumentWithCustomer extends Document {
  customers?: { name: string; company: string | null } | null;
}

interface DocumentListProps {
  documents: DocumentWithCustomer[];
}

export function DocumentList({ documents }: DocumentListProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

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

  const handleDelete = () => {
    if (selected.size === 0) return;

    startTransition(async () => {
      const result = await deleteDocuments(Array.from(selected));
      if (result.error) {
        toast.error("Delete failed", { description: result.error });
      } else {
        toast.success(`Deleted ${result.count} document(s)`);
        setSelected(new Set());
      }
    });
  };

  const handleRetry = (documentId: string) => {
    startTransition(async () => {
      const result = await retryDocumentOCR(documentId);
      if (result.error) {
        toast.error("Retry failed", { description: result.error });
      } else {
        toast.success("Reprocessing started");
      }
    });
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No documents yet</p>
        <p className="text-sm">Upload your first document to get started</p>
      </div>
    );
  }

  return (
    <div className={isPending ? "opacity-70 pointer-events-none" : ""}>
      {/* Toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-4 p-2 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selected.size} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      )}

      {/* Document Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-10 p-3">
                <Checkbox
                  checked={selected.size === documents.length}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="text-left p-3 text-sm font-medium">ID</th>
              <th className="text-left p-3 text-sm font-medium">Document</th>
              <th className="text-left p-3 text-sm font-medium">Customer</th>
              <th className="text-left p-3 text-sm font-medium">Type</th>
              <th className="text-left p-3 text-sm font-medium">Status</th>
              <th className="text-left p-3 text-sm font-medium">Uploaded</th>
              <th className="w-20 p-3"></th>
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
                  <Badge variant="outline" className="font-mono text-xs">
                    {doc.document_number || "-"}
                  </Badge>
                </td>
                <td className="p-3">
                  <Link
                    href={`/documents/${doc.id}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.file_size || 0)}
                      </p>
                    </div>
                  </Link>
                </td>
                <td className="p-3 text-sm">
                  {doc.customers ? (
                    <span>
                      {doc.customers.name}
                      {doc.customers.company && (
                        <span className="text-muted-foreground">
                          {" "}
                          ({doc.customers.company})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="p-3 text-sm capitalize">
                  {doc.document_type || "-"}
                </td>
                <td className="p-3">
                  <ProcessingStatus status={(doc.status || "pending") as DocumentStatus} />
                </td>
                <td className="p-3 text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(doc.created_at || new Date()))}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    {doc.status === "failed" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRetry(doc.id)}
                        title="Retry processing"
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                    )}
                    <Link href={`/documents/${doc.id}`}>
                      <Button variant="ghost" size="icon" title="View details">
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
    </div>
  );
}

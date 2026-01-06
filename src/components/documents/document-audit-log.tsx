"use client";

import { useEffect, useState } from "react";
import {
  Upload,
  Eye,
  Edit,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils/format";
import type { DocumentAuditLog } from "@/types/database";

interface DocumentAuditLogProps {
  documentId: string;
  initialLogs?: AuditLogWithUser[];
}

interface AuditLogWithUser extends DocumentAuditLog {
  users?: { name: string | null; email: string } | null;
}

const actionIcons: Record<string, React.ReactNode> = {
  created: <Upload className="h-4 w-4 text-green-500" />,
  viewed: <Eye className="h-4 w-4 text-blue-500" />,
  updated: <Edit className="h-4 w-4 text-yellow-500" />,
  downloaded: <Download className="h-4 w-4 text-purple-500" />,
  deleted: <Trash2 className="h-4 w-4 text-red-500" />,
  processing_started: <RefreshCw className="h-4 w-4 text-orange-500" />,
  processing_completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  processing_failed: <XCircle className="h-4 w-4 text-red-500" />,
  ocr_retry: <RefreshCw className="h-4 w-4 text-blue-500" />,
};

const actionLabels: Record<string, string> = {
  created: "Document uploaded",
  viewed: "Document viewed",
  updated: "Document updated",
  downloaded: "Document downloaded",
  deleted: "Document deleted",
  processing_started: "OCR processing started",
  processing_completed: "OCR processing completed",
  processing_failed: "OCR processing failed",
  ocr_retry: "OCR retry requested",
};

export function DocumentAuditLog({
  documentId,
  initialLogs = [],
}: DocumentAuditLogProps) {
  const [logs, setLogs] = useState<AuditLogWithUser[]>(initialLogs);
  const [isLoading, setIsLoading] = useState(initialLogs.length === 0);

  useEffect(() => {
    if (initialLogs.length === 0) {
      fetchLogs();
    }
  }, [documentId]);

  const fetchLogs = async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}/audit-log`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-4">
        {logs.map((log, index) => (
          <div key={log.id} className="relative flex gap-4 pl-10">
            {/* Timeline dot */}
            <div className="absolute left-2 top-1 w-4 h-4 rounded-full bg-background border-2 border-border flex items-center justify-center">
              {actionIcons[log.action] || (
                <FileText className="h-3 w-3 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {actionLabels[log.action] || log.action}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(log.created_at))}
                </span>
              </div>

              {log.users && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  by {log.users.name || log.users.email}
                </p>
              )}

              {log.details && Object.keys(log.details).length > 0 && (
                <div className="mt-1 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                  {Object.entries(log.details as Record<string, unknown>).map(
                    ([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key}:</span>{" "}
                        {String(value)}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  Flag,
  Link as LinkIcon,
  Unlink,
  User,
  FileSearch,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DocumentAuditLog as AuditLogType } from "@/types/database";

interface DocumentAuditLogProps {
  documentId: string;
  initialLogs?: AuditLogWithUser[];
}

interface AuditLogWithUser extends AuditLogType {
  users?: { name: string | null; email: string } | null;
}

// Action configuration with icons, colors, and labels
const actionConfig: Record<string, {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  category: "lifecycle" | "processing" | "interaction" | "modification";
}> = {
  uploaded: {
    icon: <Upload className="h-3.5 w-3.5" />,
    label: "Document uploaded",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/40",
    borderColor: "border-green-300 dark:border-green-700",
    category: "lifecycle",
  },
  viewed: {
    icon: <Eye className="h-3.5 w-3.5" />,
    label: "Document viewed",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/40",
    borderColor: "border-blue-300 dark:border-blue-700",
    category: "interaction",
  },
  field_edited: {
    icon: <Edit className="h-3.5 w-3.5" />,
    label: "Field edited",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/40",
    borderColor: "border-amber-300 dark:border-amber-700",
    category: "modification",
  },
  downloaded: {
    icon: <Download className="h-3.5 w-3.5" />,
    label: "Document downloaded",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/40",
    borderColor: "border-purple-300 dark:border-purple-700",
    category: "interaction",
  },
  deleted: {
    icon: <Trash2 className="h-3.5 w-3.5" />,
    label: "Document deleted",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/40",
    borderColor: "border-red-300 dark:border-red-700",
    category: "lifecycle",
  },
  ocr_started: {
    icon: <FileSearch className="h-3.5 w-3.5" />,
    label: "OCR processing started",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/40",
    borderColor: "border-orange-300 dark:border-orange-700",
    category: "processing",
  },
  ocr_completed: {
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    label: "OCR processing completed",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/40",
    borderColor: "border-green-300 dark:border-green-700",
    category: "processing",
  },
  ocr_failed: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: "OCR processing failed",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/40",
    borderColor: "border-red-300 dark:border-red-700",
    category: "processing",
  },
  ocr_retry: {
    icon: <RefreshCw className="h-3.5 w-3.5" />,
    label: "OCR retry requested",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/40",
    borderColor: "border-blue-300 dark:border-blue-700",
    category: "processing",
  },
  flags_detected: {
    icon: <Flag className="h-3.5 w-3.5" />,
    label: "Flags detected",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/40",
    borderColor: "border-yellow-300 dark:border-yellow-700",
    category: "processing",
  },
  flag_resolved: {
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    label: "Flag resolved",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/40",
    borderColor: "border-green-300 dark:border-green-700",
    category: "modification",
  },
  linked_customer: {
    icon: <LinkIcon className="h-3.5 w-3.5" />,
    label: "Linked to person",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/40",
    borderColor: "border-indigo-300 dark:border-indigo-700",
    category: "modification",
  },
  unlinked_customer: {
    icon: <Unlink className="h-3.5 w-3.5" />,
    label: "Unlinked from person",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800/40",
    borderColor: "border-gray-300 dark:border-gray-600",
    category: "modification",
  },
  exported: {
    icon: <Download className="h-3.5 w-3.5" />,
    label: "Data exported",
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-100 dark:bg-teal-900/40",
    borderColor: "border-teal-300 dark:border-teal-700",
    category: "interaction",
  },
};

// Default config for unknown actions
const defaultActionConfig = {
  icon: <FileText className="h-3.5 w-3.5" />,
  label: "Activity",
  color: "text-gray-600 dark:text-gray-400",
  bgColor: "bg-gray-100 dark:bg-gray-800/40",
  borderColor: "border-gray-300 dark:border-gray-600",
  category: "interaction" as const,
};

function getActionConfig(action: string) {
  return actionConfig[action] || { ...defaultActionConfig, label: action.replace(/_/g, " ") };
}

// Format details for display
function formatDetails(details: Record<string, unknown>, action: string): React.ReactNode {
  if (!details || Object.keys(details).length === 0) return null;

  // Custom formatting for specific actions
  if (action === "flags_detected" && details.flagCount) {
    const flagTypes = (details.flags as Array<{ type: string; severity: string }>) || [];
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {flagTypes.map((flag, i) => (
          <Badge
            key={i}
            variant="outline"
            className={cn(
              "text-xs",
              flag.severity === "critical" && "border-red-300 text-red-600 dark:border-red-700 dark:text-red-400",
              flag.severity === "warning" && "border-yellow-300 text-yellow-600 dark:border-yellow-700 dark:text-yellow-400",
              flag.severity === "info" && "border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400"
            )}
          >
            {flag.type.replace(/_/g, " ")}
          </Badge>
        ))}
      </div>
    );
  }

  if (action === "field_edited" && details.field) {
    return (
      <div className="text-xs text-muted-foreground mt-1">
        Changed <span className="font-medium">{String(details.field)}</span>
        {details.oldValue !== undefined && (
          <> from <span className="line-through">{String(details.oldValue || "empty")}</span></>
        )}
        {details.newValue !== undefined && (
          <> to <span className="font-medium">{String(details.newValue || "empty")}</span></>
        )}
      </div>
    );
  }

  if (action === "uploaded") {
    return (
      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
        {details.fileType ? <div>Type: {String(details.fileType)}</div> : null}
        {details.fileSize ? <div>Size: {formatFileSize(details.fileSize as number)}</div> : null}
      </div>
    );
  }

  if (action === "ocr_completed" && details.documentType) {
    return (
      <div className="text-xs text-muted-foreground mt-1">
        Detected as <Badge variant="outline" className="text-xs capitalize">{String(details.documentType)}</Badge>
        {details.pageCount ? <span className="ml-2">({String(details.pageCount)} page{Number(details.pageCount) !== 1 ? "s" : ""})</span> : null}
      </div>
    );
  }

  if (action === "ocr_failed" && details.error) {
    return (
      <div className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-start gap-1">
        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
        <span>{String(details.error)}</span>
      </div>
    );
  }

  if (action === "linked_customer" && details.customerName) {
    return (
      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
        <User className="h-3 w-3" />
        {String(details.customerName)}
      </div>
    );
  }

  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Group consecutive view events
function groupLogs(logs: AuditLogWithUser[]): Array<AuditLogWithUser | { type: "grouped_views"; count: number; firstLog: AuditLogWithUser; lastLog: AuditLogWithUser }> {
  const result: Array<AuditLogWithUser | { type: "grouped_views"; count: number; firstLog: AuditLogWithUser; lastLog: AuditLogWithUser }> = [];
  let viewGroup: AuditLogWithUser[] = [];

  for (const log of logs) {
    if (log.action === "viewed") {
      viewGroup.push(log);
    } else {
      if (viewGroup.length > 2) {
        result.push({
          type: "grouped_views",
          count: viewGroup.length,
          firstLog: viewGroup[0],
          lastLog: viewGroup[viewGroup.length - 1],
        });
      } else {
        result.push(...viewGroup);
      }
      viewGroup = [];
      result.push(log);
    }
  }

  // Handle remaining view group
  if (viewGroup.length > 2) {
    result.push({
      type: "grouped_views",
      count: viewGroup.length,
      firstLog: viewGroup[0],
      lastLog: viewGroup[viewGroup.length - 1],
    });
  } else {
    result.push(...viewGroup);
  }

  return result;
}

export function DocumentAuditLog({
  documentId,
  initialLogs = [],
}: DocumentAuditLogProps) {
  const [logs, setLogs] = useState<AuditLogWithUser[]>(initialLogs);
  const [isLoading, setIsLoading] = useState(initialLogs.length === 0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (initialLogs.length === 0) {
      fetchLogs();
    }
  }, [documentId, initialLogs.length]);

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
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm font-medium">No activity recorded yet</p>
        <p className="text-xs mt-1">Activity will appear here as you work with this document</p>
      </div>
    );
  }

  const groupedLogs = groupLogs(logs);
  const displayLogs = showAll ? groupedLogs : groupedLogs.slice(0, 5);
  const hasMore = groupedLogs.length > 5;

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">Activity Timeline</h3>
        <Badge variant="secondary" className="text-xs">
          {logs.length} event{logs.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-3 top-3 bottom-3 w-px bg-border" />

        <div className="space-y-2">
          {displayLogs.map((item, index) => {
            // Handle grouped views
            if ("type" in item && item.type === "grouped_views") {
              const config = getActionConfig("viewed");
              return (
                <div key={`group-${index}`} className="relative flex gap-3 pl-1">
                  <div className={cn(
                    "relative z-10 flex items-center justify-center w-6 h-6 rounded-full border",
                    config.bgColor,
                    config.borderColor
                  )}>
                    <Eye className={cn("h-3 w-3", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Viewed {item.count} times
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(item.lastLog.created_at))} - {formatDistanceToNow(new Date(item.firstLog.created_at))}
                    </p>
                  </div>
                </div>
              );
            }

            // Handle regular log entry
            const log = item as AuditLogWithUser;
            const config = getActionConfig(log.action);

            return (
              <div key={log.id} className="relative flex gap-3 pl-1">
                {/* Icon */}
                <div className={cn(
                  "relative z-10 flex items-center justify-center w-6 h-6 rounded-full border",
                  config.bgColor,
                  config.borderColor
                )}>
                  <span className={config.color}>{config.icon}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-sm font-medium", config.color)}>
                      {config.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at))}
                    </span>
                  </div>

                  {log.users && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <User className="h-3 w-3" />
                      {log.users.name || log.users.email}
                    </p>
                  )}

                  {formatDetails(log.details as Record<string, unknown>, log.action)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Show more/less button */}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-muted-foreground hover:text-foreground"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Show {groupedLogs.length - 5} more
            </>
          )}
        </Button>
      )}
    </div>
  );
}

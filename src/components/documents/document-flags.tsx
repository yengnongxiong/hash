"use client";

import { useState } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  Copy,
  DollarSign,
  FileQuestion,
  Flag,
  Loader2,
  CheckCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "@/lib/utils/format";
import { resolveDocumentFlag, resolveAllDocumentFlags } from "@/lib/ocr/detect-flags";
import { toast } from "sonner";

interface DocumentFlag {
  id: string;
  document_id: string;
  flag_type: string;
  severity: string;
  message: string;
  details: Record<string, unknown>;
  resolved: boolean;
  resolved_at?: string;
  resolved_by_user?: { name: string | null; email: string } | null;
  created_at: string;
}

interface DocumentFlagsProps {
  flags: DocumentFlag[];
  onFlagResolved?: () => void;
}

const flagTypeIcons: Record<string, React.ReactNode> = {
  past_due: <Clock className="h-4 w-4" />,
  duplicate_invoice: <Copy className="h-4 w-4" />,
  suspicious_amount: <DollarSign className="h-4 w-4" />,
  missing_data: <FileQuestion className="h-4 w-4" />,
  other: <Flag className="h-4 w-4" />,
};

const severityStyles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  critical: {
    bg: "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800",
    text: "text-red-700 dark:text-red-400",
    icon: <AlertCircle className="h-4 w-4 text-red-500" />,
  },
  warning: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800",
    text: "text-yellow-700 dark:text-yellow-400",
    icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  },
  info: {
    bg: "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-400",
    icon: <Info className="h-4 w-4 text-blue-500" />,
  },
};

export function DocumentFlags({ flags, onFlagResolved }: DocumentFlagsProps) {
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [isResolvingAll, setIsResolvingAll] = useState(false);

  const unresolvedFlags = flags.filter((f) => !f.resolved);
  const resolvedFlags = flags.filter((f) => f.resolved);

  const handleResolve = async (flagId: string) => {
    setResolvingId(flagId);
    try {
      const result = await resolveDocumentFlag(flagId);
      if (result.success) {
        toast.success("Flag resolved");
        onFlagResolved?.();
      } else {
        toast.error(result.error || "Failed to resolve flag");
      }
    } catch {
      toast.error("Failed to resolve flag");
    } finally {
      setResolvingId(null);
    }
  };

  const handleResolveAll = async () => {
    if (unresolvedFlags.length === 0) return;

    setIsResolvingAll(true);
    try {
      const documentId = unresolvedFlags[0]?.document_id;
      if (!documentId) {
        // Fallback: resolve each flag individually
        for (const flag of unresolvedFlags) {
          await resolveDocumentFlag(flag.id);
        }
        toast.success(`${unresolvedFlags.length} flags resolved`);
        onFlagResolved?.();
        return;
      }

      const result = await resolveAllDocumentFlags(documentId);
      if (result.success) {
        toast.success(`${result.count} flags resolved`);
        onFlagResolved?.();
      } else {
        toast.error(result.error || "Failed to resolve flags");
      }
    } catch {
      toast.error("Failed to resolve flags");
    } finally {
      setIsResolvingAll(false);
    }
  };

  if (flags.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Document Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            No issues detected
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Document Flags
            {unresolvedFlags.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unresolvedFlags.length} unresolved
              </Badge>
            )}
          </CardTitle>
          {unresolvedFlags.length > 1 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleResolveAll}
              disabled={isResolvingAll}
              className="h-7 text-xs"
            >
              {isResolvingAll ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <CheckCheck className="h-3 w-3 mr-1" />
              )}
              Resolve All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {unresolvedFlags.map((flag) => {
          const style = severityStyles[flag.severity] || severityStyles.info;
          return (
            <div
              key={flag.id}
              className={`p-3 rounded-lg border ${style.bg}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1">
                  <div className="mt-0.5">
                    {flagTypeIcons[flag.flag_type] || flagTypeIcons.other}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {style.icon}
                      <span className={`text-sm font-medium ${style.text}`}>
                        {flag.message}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Detected {formatDistanceToNow(new Date(flag.created_at))}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolve(flag.id)}
                  disabled={resolvingId === flag.id}
                  className="shrink-0"
                >
                  {resolvingId === flag.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Resolve"
                  )}
                </Button>
              </div>
            </div>
          );
        })}

        {resolvedFlags.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">
              {resolvedFlags.length} resolved flag(s)
            </p>
            {resolvedFlags.map((flag) => (
              <div
                key={flag.id}
                className="p-2 rounded bg-muted/50 flex items-center gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="line-through">{flag.message}</span>
                {flag.resolved_by_user && (
                  <span className="text-xs">
                    by {flag.resolved_by_user.name || flag.resolved_by_user.email}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

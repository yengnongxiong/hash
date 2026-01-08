"use client";

import { CheckCircle, Clock, AlertCircle, Loader2, Eye, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type DocumentStatus = "pending" | "processing" | "pending_review" | "completed" | "failed" | "rejected";

interface ProcessingStatusProps {
  status: DocumentStatus;
  className?: string;
  showLabel?: boolean;
}

const statusConfig: Record<
  DocumentStatus,
  { icon: typeof CheckCircle; label: string; className: string }
> = {
  pending: {
    icon: Clock,
    label: "Pending",
    className: "text-muted-foreground bg-muted",
  },
  processing: {
    icon: Loader2,
    label: "Processing",
    className: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30",
  },
  pending_review: {
    icon: Eye,
    label: "Pending Review",
    className: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
  },
  completed: {
    icon: CheckCircle,
    label: "Completed",
    className: "text-green-600 bg-green-100 dark:bg-green-900/30",
  },
  failed: {
    icon: AlertCircle,
    label: "Failed",
    className: "text-destructive bg-destructive/10",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    className: "text-orange-600 bg-orange-100 dark:bg-orange-900/30",
  },
};

export function ProcessingStatus({
  status,
  className,
  showLabel = true,
}: ProcessingStatusProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      <Icon
        className={cn("h-3.5 w-3.5", status === "processing" && "animate-spin")}
      />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}

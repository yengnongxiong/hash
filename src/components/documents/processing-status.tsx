"use client";

import { CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type DocumentStatus = "pending" | "processing" | "completed" | "failed";

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
    className: "text-yellow-600 bg-yellow-100",
  },
  completed: {
    icon: CheckCircle,
    label: "Completed",
    className: "text-green-600 bg-green-100",
  },
  failed: {
    icon: AlertCircle,
    label: "Failed",
    className: "text-destructive bg-destructive/10",
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

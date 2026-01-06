"use client";

import { useState, useTransition } from "react";
import { SystemAlert } from "@/types/database";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bell, Info, Megaphone, X } from "lucide-react";
import { dismissAlert } from "@/app/(dashboard)/settings/actions";
import { cn } from "@/lib/utils";

interface SystemAlertBannerProps {
  alerts: SystemAlert[];
  userId: string;
}

const ALERT_TYPE_CONFIG = {
  info: {
    icon: Info,
    bgColor: "bg-blue-500",
    textColor: "text-white",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-yellow-500",
    textColor: "text-black",
  },
  maintenance: {
    icon: Bell,
    bgColor: "bg-orange-500",
    textColor: "text-white",
  },
  critical: {
    icon: Megaphone,
    bgColor: "bg-red-500",
    textColor: "text-white",
  },
};

export function SystemAlertBanner({ alerts, userId }: SystemAlertBannerProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  // Filter to active alerts not dismissed by this user
  const activeAlerts = alerts.filter((alert) => {
    if (!alert.active) return false;
    if (dismissedAlerts.has(alert.id)) return false;
    if (alert.dismissed_by?.includes(userId)) return false;

    // Check date range
    const now = new Date();
    if (alert.starts_at && new Date(alert.starts_at) > now) return false;
    if (alert.ends_at && new Date(alert.ends_at) < now) return false;

    return true;
  });

  if (activeAlerts.length === 0) {
    return null;
  }

  const handleDismiss = (alertId: string) => {
    // Optimistic update
    setDismissedAlerts((prev) => new Set(prev).add(alertId));

    startTransition(async () => {
      const result = await dismissAlert(alertId);
      if (result.error) {
        // Revert on error
        setDismissedAlerts((prev) => {
          const next = new Set(prev);
          next.delete(alertId);
          return next;
        });
      }
    });
  };

  // Show the most important alert (critical > maintenance > warning > info)
  const priorityOrder = ["critical", "maintenance", "warning", "info"];
  const sortedAlerts = [...activeAlerts].sort(
    (a, b) =>
      priorityOrder.indexOf(a.alert_type) - priorityOrder.indexOf(b.alert_type)
  );

  const alert = sortedAlerts[0];
  const config = ALERT_TYPE_CONFIG[alert.alert_type as keyof typeof ALERT_TYPE_CONFIG] || ALERT_TYPE_CONFIG.info;
  const Icon = config.icon;

  return (
    <div className={cn("px-4 py-2", config.bgColor, config.textColor)}>
      <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Icon className="h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="font-medium mr-2">{alert.title}</span>
            <span className="opacity-90">{alert.message}</span>
          </div>
          {sortedAlerts.length > 1 && (
            <span className="text-xs opacity-75 shrink-0">
              +{sortedAlerts.length - 1} more
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6 shrink-0 hover:bg-black/10",
            config.textColor
          )}
          onClick={() => handleDismiss(alert.id)}
          disabled={isPending}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

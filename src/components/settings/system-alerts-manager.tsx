"use client";

import { SystemAlert } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Bell,
  Info,
  Megaphone,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SystemAlertsManagerProps {
  alerts: SystemAlert[];
}

const ALERT_TYPE_CONFIG = {
  info: {
    icon: Info,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    label: "Information",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    label: "Warning",
  },
  maintenance: {
    icon: Bell,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    label: "Maintenance",
  },
  critical: {
    icon: Megaphone,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    label: "Critical",
  },
};

export function SystemAlertsManager({ alerts }: SystemAlertsManagerProps) {
  // Filter to show only active alerts
  const activeAlerts = alerts.filter((a) => a.active);

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          System Notices
        </CardTitle>
        <CardDescription>
          Important announcements from the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeAlerts.map((alert) => {
            const config = ALERT_TYPE_CONFIG[alert.alert_type as keyof typeof ALERT_TYPE_CONFIG] || ALERT_TYPE_CONFIG.info;
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className={cn(
                  "p-4 rounded-lg border",
                  config.bgColor,
                  config.borderColor
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", config.color)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{alert.title}</h4>
                      <Badge variant="outline">{config.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>
                        Posted: {format(new Date(alert.starts_at || alert.created_at), "MMM d, yyyy")}
                      </span>
                      {alert.ends_at && (
                        <span>
                          Until: {format(new Date(alert.ends_at), "MMM d, yyyy h:mm a")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

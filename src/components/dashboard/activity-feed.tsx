"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Upload,
  Eye,
  Edit,
  UserPlus,
  FileText,
  CheckCircle,
  XCircle,
  Calendar,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "@/lib/utils/format";
import { createClient } from "@/lib/supabase/client";

interface ActivityItem {
  id: string;
  type: "document" | "customer" | "appointment";
  action: string;
  entity_name: string;
  entity_id: string;
  user_name?: string;
  created_at: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  uploaded: <Upload className="h-4 w-4 text-blue-500" />,
  viewed: <Eye className="h-4 w-4 text-gray-500" />,
  updated: <Edit className="h-4 w-4 text-yellow-500" />,
  created: <UserPlus className="h-4 w-4 text-green-500" />,
  ocr_completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  ocr_failed: <XCircle className="h-4 w-4 text-red-500" />,
  scheduled: <Calendar className="h-4 w-4 text-purple-500" />,
};

const actionLabels: Record<string, string> = {
  uploaded: "uploaded document",
  viewed: "viewed",
  updated: "updated",
  created: "created",
  ocr_completed: "OCR completed for",
  ocr_failed: "OCR failed for",
  scheduled: "scheduled appointment",
};

interface ActivityFeedProps {
  initialActivities?: ActivityItem[];
}

export function ActivityFeed({ initialActivities = [] }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);
  const [isLoading, setIsLoading] = useState(initialActivities.length === 0);

  useEffect(() => {
    if (initialActivities.length === 0) {
      fetchActivities();
    }

    // Set up realtime subscription
    const supabase = createClient();
    const channel = supabase
      .channel("activity_feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "document_audit_log",
        },
        async (payload) => {
          // Fetch the new activity with document info
          const { data } = await supabase
            .from("document_audit_log")
            .select("*, documents(file_name), users(name, email)")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            const newActivity: ActivityItem = {
              id: data.id,
              type: "document",
              action: data.action,
              entity_name: data.documents?.file_name || "Unknown",
              entity_id: data.document_id,
              user_name: data.users?.name || data.users?.email,
              created_at: data.created_at,
            };
            setActivities((prev) => [newActivity, ...prev.slice(0, 9)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActivities = async () => {
    const supabase = createClient();

    // Fetch recent document audit logs
    const { data: auditLogs } = await supabase
      .from("document_audit_log")
      .select("*, documents(file_name), users(name, email)")
      .order("created_at", { ascending: false })
      .limit(10);

    if (auditLogs) {
      const activities: ActivityItem[] = auditLogs.map((log) => ({
        id: log.id,
        type: "document" as const,
        action: log.action,
        entity_name: log.documents?.file_name || "Unknown",
        entity_id: log.document_id,
        user_name: log.users?.name || log.users?.email,
        created_at: log.created_at,
      }));
      setActivities(activities);
    }

    setIsLoading(false);
  };

  const getEntityLink = (item: ActivityItem) => {
    switch (item.type) {
      case "document":
        return `/documents/${item.entity_id}`;
      case "customer":
        return `/customers`;
      case "appointment":
        return `/customers/appointments`;
      default:
        return "#";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 py-2 border-b last:border-0"
              >
                <div className="mt-0.5">
                  {actionIcons[item.action] || (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    {item.user_name && (
                      <span className="font-medium">{item.user_name}</span>
                    )}{" "}
                    {actionLabels[item.action] || item.action}{" "}
                    <Link
                      href={getEntityLink(item)}
                      className="font-medium hover:underline"
                    >
                      {item.entity_name}
                    </Link>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(item.created_at))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

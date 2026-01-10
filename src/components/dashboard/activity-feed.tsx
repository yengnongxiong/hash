"use client";

import { useEffect, useState, useCallback } from "react";
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
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/utils/format";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

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

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export function ActivityFeed({ initialActivities = [] }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);
  const [isLoading, setIsLoading] = useState(initialActivities.length === 0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchActivities = useCallback(async () => {
    const supabase = createClient();

    // Fetch audit logs without relationship joins
    const { data: auditLogs, error } = await supabase
      .from("document_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      toast.error("Failed to load activities");
      return;
    }

    if (auditLogs && auditLogs.length > 0) {
      // Fetch related documents
      const docIds = [...new Set(auditLogs.filter(l => l.document_id).map(l => l.document_id))];
      let docsMap: Record<string, { file_name: string }> = {};
      if (docIds.length > 0) {
        const { data: docs } = await supabase
          .from("documents")
          .select("id, file_name")
          .in("id", docIds);
        if (docs) {
          docsMap = Object.fromEntries(docs.map(d => [d.id, { file_name: d.file_name }]));
        }
      }

      // Fetch related users
      const userIds = [...new Set(auditLogs.filter(l => l.user_id).map(l => l.user_id as string))];
      let usersMap: Record<string, { name: string | null; email: string }> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, name, email")
          .in("id", userIds);
        if (users) {
          usersMap = Object.fromEntries(users.map(u => [u.id, { name: u.name, email: u.email }]));
        }
      }

      const activities: ActivityItem[] = auditLogs.map((log) => {
        const doc = log.document_id ? docsMap[log.document_id] : null;
        const user = log.user_id ? usersMap[log.user_id] : null;
        return {
          id: log.id,
          type: "document" as const,
          action: log.action || "unknown",
          entity_name: doc?.file_name || "Unknown",
          entity_id: log.document_id,
          user_name: user?.name || user?.email,
          created_at: log.created_at || new Date().toISOString(),
        };
      });
      setActivities(activities);
    }

    setIsLoading(false);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchActivities();
    setIsRefreshing(false);
    toast.success("Activity feed refreshed");
  };

  useEffect(() => {
    if (initialActivities.length === 0) {
      fetchActivities();
    }

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
          const { data: logData, error } = await supabase
            .from("document_audit_log")
            .select("*")
            .eq("id", payload.new.id)
            .single();

          if (error) {
            console.error("Failed to fetch new activity:", error);
            return;
          }

          if (logData) {
            // Fetch document name
            let docName = "Unknown";
            if (logData.document_id) {
              const { data: doc } = await supabase
                .from("documents")
                .select("file_name")
                .eq("id", logData.document_id)
                .single();
              if (doc) docName = doc.file_name;
            }

            // Fetch user info
            let userName: string | undefined;
            if (logData.user_id) {
              const { data: user } = await supabase
                .from("users")
                .select("name, email")
                .eq("id", logData.user_id)
                .single();
              if (user) userName = user.name || user.email;
            }

            const newActivity: ActivityItem = {
              id: logData.id,
              type: "document",
              action: logData.action || "unknown",
              entity_name: docName,
              entity_id: logData.document_id,
              user_name: userName,
              created_at: logData.created_at || new Date().toISOString(),
            };
            setActivities((prev) => [newActivity, ...prev.slice(0, 9)]);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
        } else if (status === "CLOSED") {
          setConnectionStatus("disconnected");
        } else if (status === "CHANNEL_ERROR") {
          setConnectionStatus("error");
          console.error("Realtime subscription error:", err);
          toast.error("Live updates disconnected. Click refresh to update manually.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActivities, initialActivities.length]);

  const getEntityLink = (item: ActivityItem) => {
    switch (item.type) {
      case "document":
        return `/documents/${item.entity_id}`;
      case "customer":
        return `/people`;
      case "appointment":
        return `/people/appointments`;
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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
            {connectionStatus === "connected" && (
              <Badge variant="outline" className="ml-2 text-xs font-normal text-green-600 border-green-300">
                Live
              </Badge>
            )}
            {(connectionStatus === "disconnected" || connectionStatus === "error") && (
              <Badge variant="outline" className="ml-2 text-xs font-normal text-yellow-600 border-yellow-300">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 p-0"
            aria-label="Refresh activity feed"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
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

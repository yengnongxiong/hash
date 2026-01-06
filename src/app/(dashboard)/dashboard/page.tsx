import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileText,
  Clock,
  CheckCircle,
  LayoutGrid,
  ArrowRight,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { format, startOfDay, addDays, isPast, isToday } from "date-fns";
import { formatDistanceToNow } from "@/lib/utils/format";

interface ExtractedData {
  dueDate?: string;
  expirationDate?: string;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get start of today in ISO format
  const todayStart = startOfDay(new Date());
  const nextWeek = addDays(new Date(), 7);

  // Get counts for dashboard stats
  const [
    customersResult,
    documentsResult,
    processingResult,
    completedTodayResult,
    failedResult,
  ] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("status", "processing"),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("updated_at", todayStart.toISOString()),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
  ]);

  const needsAttention = (processingResult.count ?? 0) + (failedResult.count ?? 0);

  const stats = [
    {
      title: "Total Customers",
      value: customersResult.count ?? 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Total Documents",
      value: documentsResult.count ?? 0,
      icon: FileText,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      title: "Completed Today",
      value: completedTodayResult.count ?? 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "Needs Attention",
      value: needsAttention,
      icon: AlertCircle,
      color: needsAttention > 0 ? "text-orange-600" : "text-muted-foreground",
      bgColor: needsAttention > 0 ? "bg-orange-50 dark:bg-orange-950" : "bg-muted",
    },
  ];

  // Get recent documents
  const { data: recentDocuments } = await supabase
    .from("documents")
    .select("id, file_name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  // Get upcoming appointments
  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, title, start_time, status, customers(name)")
    .gte("start_time", todayStart.toISOString())
    .lte("start_time", nextWeek.toISOString())
    .order("start_time", { ascending: true })
    .limit(5);

  // Get documents with due dates
  const { data: documentsWithDates } = await supabase
    .from("documents")
    .select("id, file_name, extracted_data")
    .eq("status", "completed")
    .not("extracted_data", "is", null);

  // Extract upcoming due dates
  const upcomingDates: Array<{
    id: string;
    documentId: string;
    documentName: string;
    date: Date;
    type: string;
    isOverdue: boolean;
  }> = [];

  const thirtyDaysFromNow = addDays(new Date(), 30);

  for (const doc of documentsWithDates || []) {
    const data = doc.extracted_data as ExtractedData | null;
    if (!data) continue;

    if (data.dueDate) {
      const dueDate = new Date(data.dueDate);
      if (dueDate <= thirtyDaysFromNow) {
        upcomingDates.push({
          id: `${doc.id}-due`,
          documentId: doc.id,
          documentName: doc.file_name,
          date: dueDate,
          type: "Due Date",
          isOverdue: isPast(dueDate) && !isToday(dueDate),
        });
      }
    }

    if (data.expirationDate) {
      const expDate = new Date(data.expirationDate);
      if (expDate <= thirtyDaysFromNow) {
        upcomingDates.push({
          id: `${doc.id}-exp`,
          documentId: doc.id,
          documentName: doc.file_name,
          date: expDate,
          type: "Expiration",
          isOverdue: isPast(expDate) && !isToday(expDate),
        });
      }
    }
  }

  upcomingDates.sort((a, b) => a.date.getTime() - b.date.getTime());
  const overdueCount = upcomingDates.filter((d) => d.isOverdue).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your workspace.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Documents</CardTitle>
            <Link href="/documents">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentDocuments && recentDocuments.length > 0 ? (
              <div className="space-y-4">
                {recentDocuments.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/documents/${doc.id}`}
                    className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium truncate max-w-[180px]">
                        {doc.file_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          doc.status === "completed"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : doc.status === "processing"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : doc.status === "failed"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No documents yet</p>
                <p className="text-sm">Upload your first document to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <ActivityFeed />
      </div>

      {/* Appointments and Due Dates Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Appointments</CardTitle>
            <Link href="/customers/appointments">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {appointments && appointments.length > 0 ? (
              <div className="space-y-3">
                {appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-muted">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{apt.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(apt.start_time), "MMM d, h:mm a")}
                          {apt.customers && ` • ${apt.customers.name}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {isToday(new Date(apt.start_time))
                        ? "Today"
                        : format(new Date(apt.start_time), "EEE")}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No upcoming appointments</p>
                <Link href="/customers/appointments">
                  <Button variant="link" size="sm" className="mt-2">
                    Schedule one
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Due Dates */}
        <Card className={overdueCount > 0 ? "border-orange-500/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Upcoming Due Dates</CardTitle>
              {overdueCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {overdueCount} overdue
                </Badge>
              )}
            </div>
            <Link href="/documents/calendar">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingDates.length > 0 ? (
              <div className="space-y-3">
                {upcomingDates.slice(0, 5).map((item) => (
                  <Link
                    key={item.id}
                    href={`/documents/${item.documentId}`}
                    className={`flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors ${
                      item.isOverdue ? "border-red-500/50 bg-red-500/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg ${
                          item.isOverdue ? "bg-red-100 dark:bg-red-900" : "bg-muted"
                        }`}
                      >
                        <FileText
                          className={`h-4 w-4 ${
                            item.isOverdue
                              ? "text-red-600 dark:text-red-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.documentName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.type} • {format(item.date, "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <Badge variant={item.isOverdue ? "destructive" : "secondary"}>
                      {item.isOverdue
                        ? "Overdue"
                        : isToday(item.date)
                        ? "Today"
                        : formatDistanceToNow(item.date)}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No upcoming due dates</p>
                <Link href="/documents/calendar">
                  <Button variant="link" size="sm" className="mt-2">
                    View calendar
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <Link href="/documents/upload">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <FileText className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Upload Document</div>
                  <div className="text-xs text-muted-foreground">Process with OCR</div>
                </div>
              </Button>
            </Link>
            <Link href="/customers">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <Users className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Manage Customers</div>
                  <div className="text-xs text-muted-foreground">View and edit</div>
                </div>
              </Button>
            </Link>
            <Link href="/whiteboard">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <LayoutGrid className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Team Whiteboard</div>
                  <div className="text-xs text-muted-foreground">Collaborate in realtime</div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

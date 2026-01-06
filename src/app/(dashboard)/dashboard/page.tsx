import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, Clock, CheckCircle, LayoutGrid, ArrowRight } from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get start of today in ISO format
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Get counts for dashboard stats
  const [customersResult, documentsResult, processingResult, completedTodayResult] = await Promise.all([
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
  ]);

  const stats = [
    {
      title: "Total Customers",
      value: customersResult.count ?? 0,
      icon: Users,
    },
    {
      title: "Total Documents",
      value: documentsResult.count ?? 0,
      icon: FileText,
    },
    {
      title: "Processing",
      value: processingResult.count ?? 0,
      icon: Clock,
    },
    {
      title: "Completed Today",
      value: completedTodayResult.count ?? 0,
      icon: CheckCircle,
    },
  ];

  // Get recent documents
  const { data: recentDocuments } = await supabase
    .from("documents")
    .select("id, file_name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

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
              <stat.icon className="h-4 w-4 text-muted-foreground" />
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
                      <span className="text-sm font-medium">{doc.file_name}</span>
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

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminSessionValid } from "@/lib/admin/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Users,
  Building2,
  FileText,
  UserCircle,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";

export default async function AdminAnalyticsPage() {
  const isVerified = await isAdminSessionValid();
  if (!isVerified) {
    redirect("/admin/verify");
  }

  const supabase = await createClient();

  // Fetch overall stats
  const [
    { count: totalUsers },
    { count: totalOrgs },
    { count: totalCustomers },
    { count: totalDocuments },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("organizations").select("*", { count: "exact", head: true }),
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase.from("documents").select("*", { count: "exact", head: true }),
  ]);

  // Fetch recent activity (last 7 days)
  const sevenDaysAgo = subDays(new Date(), 7).toISOString();

  const [
    { count: newUsersWeek },
    { count: newDocsWeek },
    { count: newCustomersWeek },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
  ]);

  // Fetch document stats by status
  const [
    { count: completedDocs },
    { count: processingDocs },
    { count: failedDocs },
  ] = await Promise.all([
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("status", "processing"),
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed"),
  ]);

  // Fetch document types distribution
  const { data: docTypes } = await supabase
    .from("documents")
    .select("document_type")
    .not("document_type", "is", null);

  const docTypeDistribution = (docTypes || []).reduce((acc, doc) => {
    const type = doc.document_type || "other";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stats = {
    totalUsers: totalUsers || 0,
    totalOrgs: totalOrgs || 0,
    totalCustomers: totalCustomers || 0,
    totalDocuments: totalDocuments || 0,
    newUsersWeek: newUsersWeek || 0,
    newDocsWeek: newDocsWeek || 0,
    newCustomersWeek: newCustomersWeek || 0,
    completedDocs: completedDocs || 0,
    processingDocs: processingDocs || 0,
    failedDocs: failedDocs || 0,
  };

  const successRate = stats.totalDocuments > 0
    ? Math.round((stats.completedDocs / stats.totalDocuments) * 100)
    : 0;

  return (
    <AdminPageWrapper
      title="Analytics"
      description="Platform statistics and metrics"
      icon={<BarChart3 className="h-5 w-5 text-green-500" />}
      iconBg="bg-green-500/10"
    >
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-blue-500" />
                {stats.newUsersWeek > 0 && (
                  <Badge variant="default" className="text-xs">
                    +{stats.newUsersWeek} this week
                  </Badge>
                )}
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
              <p className="text-sm text-slate-400">Total Users</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Building2 className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalOrgs}</p>
              <p className="text-sm text-slate-400">Organizations</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <UserCircle className="h-5 w-5 text-cyan-500" />
                {stats.newCustomersWeek > 0 && (
                  <Badge variant="default" className="text-xs">
                    +{stats.newCustomersWeek} this week
                  </Badge>
                )}
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalCustomers}</p>
              <p className="text-sm text-slate-400">Customers</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <FileText className="h-5 w-5 text-green-500" />
                {stats.newDocsWeek > 0 && (
                  <Badge variant="default" className="text-xs">
                    +{stats.newDocsWeek} this week
                  </Badge>
                )}
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalDocuments}</p>
              <p className="text-sm text-slate-400">Documents</p>
            </CardContent>
          </Card>
        </div>

        {/* Document Processing Stats */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Processing
              </CardTitle>
              <CardDescription className="text-slate-400">
                OCR processing statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-slate-300">Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-white">{stats.completedDocs}</span>
                    <Badge variant="secondary">{successRate}%</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-slate-300">Processing</span>
                  </div>
                  <span className="text-2xl font-bold text-white">{stats.processingDocs}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-slate-300">Failed</span>
                  </div>
                  <span className="text-2xl font-bold text-white">{stats.failedDocs}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-3 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full flex">
                  <div
                    className="bg-green-500"
                    style={{
                      width: `${(stats.completedDocs / Math.max(stats.totalDocuments, 1)) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-yellow-500"
                    style={{
                      width: `${(stats.processingDocs / Math.max(stats.totalDocuments, 1)) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-red-500"
                    style={{
                      width: `${(stats.failedDocs / Math.max(stats.totalDocuments, 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Document Types
              </CardTitle>
              <CardDescription className="text-slate-400">
                Distribution by document type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(docTypeDistribution)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300 capitalize">{type}</span>
                        <span className="text-white font-medium">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${(count / stats.totalDocuments) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                {Object.keys(docTypeDistribution).length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-4">
                    No document types yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPageWrapper>
  );
}

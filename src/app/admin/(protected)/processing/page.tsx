import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminSessionValid } from "@/lib/admin/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cpu, Clock, CheckCircle, XCircle, Loader2, FileText, AlertCircle, ExternalLink } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";

export default async function AdminProcessingPage() {
  const isVerified = await isAdminSessionValid();
  if (!isVerified) {
    redirect("/login");
  }

  const supabase = createAdminClient();

  // Get document processing stats
  const [
    { count: pendingCount },
    { count: processingCount },
    { count: completedCount },
    { count: failedCount },
  ] = await Promise.all([
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("status", "processing"),
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("status", "failed"),
  ]);

  // Get recent failed documents
  const { data: failedDocuments } = await supabase
    .from("documents")
    .select("id, file_name, document_type, status, created_at, updated_at")
    .eq("status", "failed")
    .order("updated_at", { ascending: false })
    .limit(20);

  // Get processing queue
  const { data: queueItems } = await supabase
    .from("documents")
    .select("id, file_name, document_type, status, created_at")
    .in("status", ["pending", "processing"])
    .order("created_at", { ascending: true })
    .limit(10);

  // Calculate success rate (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCompleted } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("updated_at", oneDayAgo);
  const { count: recentFailed } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("status", "failed")
    .gte("updated_at", oneDayAgo);

  const totalRecent = (recentCompleted || 0) + (recentFailed || 0);
  const successRate = totalRecent > 0 ? ((recentCompleted || 0) / totalRecent * 100).toFixed(1) : "N/A";

  return (
    <AdminPageWrapper
      title="Processing"
      description="Document queue and processing status"
      icon={<Cpu className="h-5 w-5 text-cyan-500" />}
      iconBg="bg-cyan-500/10"
    >
      {/* Queue Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-yellow-500" />
              <Badge variant="secondary">{pendingCount || 0}</Badge>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{pendingCount || 0}</p>
            <p className="text-xs text-slate-400">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              <Badge variant="secondary">{processingCount || 0}</Badge>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{processingCount || 0}</p>
            <p className="text-xs text-slate-400">Processing</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <Badge variant="secondary">{completedCount || 0}</Badge>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{completedCount || 0}</p>
            <p className="text-xs text-slate-400">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <XCircle className="h-5 w-5 text-red-500" />
              <Badge variant={failedCount ? "destructive" : "secondary"}>{failedCount || 0}</Badge>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{failedCount || 0}</p>
            <p className="text-xs text-slate-400">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Success Rate */}
      <Card className="bg-slate-800/50 border-slate-700 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Success Rate (Last 24h)</p>
              <p className="text-3xl font-bold text-white">
                {successRate === "N/A" ? "N/A" : `${successRate}%`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Processed</p>
              <p className="text-lg text-white">{totalRecent} documents</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Active Queue */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Active Queue
            </CardTitle>
            <CardDescription className="text-slate-400">
              Documents waiting to be processed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(queueItems || []).map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-white truncate max-w-[200px]">
                        {doc.file_name}
                      </p>
                      <p className="text-xs text-slate-500 capitalize">
                        {doc.document_type || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={doc.status === "processing" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {doc.status === "processing" && (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    )}
                    {doc.status}
                  </Badge>
                </div>
              ))}

              {(!queueItems || queueItems.length === 0) && (
                <div className="text-center py-6 text-slate-400">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Queue is empty</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Failed Documents */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  Failed Documents
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Documents that failed processing
                </CardDescription>
              </div>
              {(failedCount || 0) > 0 && (
                <Link href="/admin/processing/failed">
                  <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                    Manage All
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(failedDocuments || []).map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-red-950/20 border border-red-900/30"
                >
                  <div className="flex items-center gap-3">
                    <XCircle className="h-4 w-4 text-red-400" />
                    <div>
                      <p className="text-sm font-medium text-white truncate max-w-[200px]">
                        {doc.file_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Failed {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {(!failedDocuments || failedDocuments.length === 0) && (
                <div className="text-center py-6 text-slate-400">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No failed documents</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPageWrapper>
  );
}

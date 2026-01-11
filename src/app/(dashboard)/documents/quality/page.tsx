import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, FileCheck, FileWarning, Clock, TrendingUp, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface QualityMetrics {
  totalDocuments: number;
  completedDocuments: number;
  pendingReviewDocuments: number;
  failedDocuments: number;
  avgProcessingTime: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  totalFlags: number;
  unresolvedFlags: number;
  resolvedFlags: number;
  totalCorrections: number;
  documentsByType: Record<string, number>;
  recentDocuments: Array<{
    id: string;
    file_name: string;
    status: string;
    document_type: string | null;
    extraction_confidence: number | null;
    created_at: string;
    flag_count: number;
  }>;
}

async function getQualityMetrics(): Promise<QualityMetrics> {
  const supabase = await createClient();

  // Fetch all documents stats
  const { data: documents } = await supabase
    .from("documents")
    .select("id, file_name, status, document_type, extraction_confidence, classification_confidence, created_at, updated_at")
    .is("deleted_at", null);

  // Fetch flags
  const { data: flags } = await supabase
    .from("document_flags")
    .select("id, document_id, resolved");

  // Fetch corrections
  const { data: corrections } = await supabase
    .from("field_corrections")
    .select("id");

  // Fetch processing metrics for avg time
  const { data: processingMetrics } = await supabase
    .from("processing_metrics")
    .select("total_duration_ms")
    .not("total_duration_ms", "is", null);

  const docs = documents || [];
  const flagsList = flags || [];

  // Calculate document counts
  const totalDocuments = docs.length;
  const completedDocuments = docs.filter(d => d.status === "completed").length;
  const pendingReviewDocuments = docs.filter(d => d.status === "pending_review").length;
  const failedDocuments = docs.filter(d => d.status === "failed" || d.status === "rejected").length;

  // Calculate confidence distribution
  const highConfidenceCount = docs.filter(d => (d.extraction_confidence || 0) >= 0.85).length;
  const mediumConfidenceCount = docs.filter(d => {
    const conf = d.extraction_confidence || 0;
    return conf >= 0.70 && conf < 0.85;
  }).length;
  const lowConfidenceCount = docs.filter(d => {
    const conf = d.extraction_confidence || 0;
    return conf > 0 && conf < 0.70;
  }).length;

  // Calculate flag stats
  const totalFlags = flagsList.length;
  const resolvedFlags = flagsList.filter(f => f.resolved).length;
  const unresolvedFlags = totalFlags - resolvedFlags;

  // Calculate avg processing time
  const avgProcessingTime = processingMetrics && processingMetrics.length > 0
    ? Math.round(processingMetrics.reduce((sum, m) => sum + (m.total_duration_ms || 0), 0) / processingMetrics.length)
    : 0;

  // Document types distribution
  const documentsByType: Record<string, number> = {};
  docs.forEach(d => {
    const type = d.document_type || "unknown";
    documentsByType[type] = (documentsByType[type] || 0) + 1;
  });

  // Flag counts per document
  const flagCountsByDoc = new Map<string, number>();
  flagsList.forEach(f => {
    flagCountsByDoc.set(f.document_id, (flagCountsByDoc.get(f.document_id) || 0) + 1);
  });

  // Recent documents with flag counts
  const recentDocuments = docs
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map(d => ({
      id: d.id,
      file_name: d.file_name,
      status: d.status || "pending",
      document_type: d.document_type,
      extraction_confidence: d.extraction_confidence,
      created_at: d.created_at,
      flag_count: flagCountsByDoc.get(d.id) || 0,
    }));

  return {
    totalDocuments,
    completedDocuments,
    pendingReviewDocuments,
    failedDocuments,
    avgProcessingTime,
    highConfidenceCount,
    mediumConfidenceCount,
    lowConfidenceCount,
    totalFlags,
    unresolvedFlags,
    resolvedFlags,
    totalCorrections: corrections?.length || 0,
    documentsByType,
    recentDocuments,
  };
}

function getConfidenceColor(confidence: number | null): string {
  if (!confidence) return "bg-gray-500";
  if (confidence >= 0.85) return "bg-green-500";
  if (confidence >= 0.70) return "bg-yellow-500";
  return "bg-red-500";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge variant="default" className="bg-green-500">Completed</Badge>;
    case "pending_review":
      return <Badge variant="secondary" className="bg-yellow-500 text-black">Review</Badge>;
    case "processing":
      return <Badge variant="secondary">Processing</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
}

export default async function DataQualityDashboardPage() {
  const metrics = await getQualityMetrics();

  const completionRate = metrics.totalDocuments > 0
    ? Math.round((metrics.completedDocuments / metrics.totalDocuments) * 100)
    : 0;

  const flagResolutionRate = metrics.totalFlags > 0
    ? Math.round((metrics.resolvedFlags / metrics.totalFlags) * 100)
    : 100;

  const highConfidenceRate = metrics.totalDocuments > 0
    ? Math.round((metrics.highConfidenceCount / metrics.totalDocuments) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/documents">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Data Quality Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor extraction accuracy, processing metrics, and document quality
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.completedDocuments} completed, {metrics.pendingReviewDocuments} pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highConfidenceRate}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.highConfidenceCount} documents with &ge;85% confidence
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.avgProcessingTime > 0 ? `${(metrics.avgProcessingTime / 1000).toFixed(1)}s` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">Per document OCR + extraction</p>
          </CardContent>
        </Card>
      </div>

      {/* Confidence Distribution & Flags */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Confidence Distribution</CardTitle>
            <CardDescription>Document extraction confidence levels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm">High (&ge;85%)</span>
                </div>
                <span className="font-medium">{metrics.highConfidenceCount}</span>
              </div>
              <Progress
                value={metrics.totalDocuments > 0 ? (metrics.highConfidenceCount / metrics.totalDocuments) * 100 : 0}
                className="h-2 [&>div]:bg-green-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">Medium (70-85%)</span>
                </div>
                <span className="font-medium">{metrics.mediumConfidenceCount}</span>
              </div>
              <Progress
                value={metrics.totalDocuments > 0 ? (metrics.mediumConfidenceCount / metrics.totalDocuments) * 100 : 0}
                className="h-2 [&>div]:bg-yellow-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm">Low (&lt;70%)</span>
                </div>
                <span className="font-medium">{metrics.lowConfidenceCount}</span>
              </div>
              <Progress
                value={metrics.totalDocuments > 0 ? (metrics.lowConfidenceCount / metrics.totalDocuments) * 100 : 0}
                className="h-2 [&>div]:bg-red-500"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flags & Issues</CardTitle>
            <CardDescription>Document flags requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span>Total Flags</span>
              </div>
              <span className="text-xl font-bold">{metrics.totalFlags}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span>Unresolved</span>
              </div>
              <span className="text-xl font-bold text-red-500">{metrics.unresolvedFlags}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Resolved</span>
              </div>
              <span className="text-xl font-bold text-green-500">{metrics.resolvedFlags}</span>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Resolution Rate</span>
                <span className="font-medium">{flagResolutionRate}%</span>
              </div>
              <Progress value={flagResolutionRate} className="mt-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Types & Corrections */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Document Types</CardTitle>
            <CardDescription>Distribution by detected document type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.documentsByType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {type.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{count}</span>
                      <span className="text-xs text-muted-foreground">
                        ({Math.round((count / metrics.totalDocuments) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
              {Object.keys(metrics.documentsByType).length === 0 && (
                <p className="text-sm text-muted-foreground">No documents processed yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quality Metrics</CardTitle>
            <CardDescription>Field corrections and accuracy indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Total Field Corrections</span>
              <span className="text-xl font-bold">{metrics.totalCorrections}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Failed Documents</span>
              <span className="text-xl font-bold text-red-500">{metrics.failedDocuments}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Pending Review</span>
              <span className="text-xl font-bold text-yellow-500">{metrics.pendingReviewDocuments}</span>
            </div>

            <div className="pt-4 border-t">
              <Link href="/documents/review">
                <Button variant="outline" className="w-full">
                  <FileWarning className="mr-2 h-4 w-4" />
                  Go to Review Queue
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Documents</CardTitle>
          <CardDescription>Latest processed documents with quality indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Document</th>
                  <th className="text-left py-2 px-3 font-medium">Type</th>
                  <th className="text-left py-2 px-3 font-medium">Status</th>
                  <th className="text-left py-2 px-3 font-medium">Confidence</th>
                  <th className="text-left py-2 px-3 font-medium">Flags</th>
                  <th className="text-left py-2 px-3 font-medium">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentDocuments.map((doc) => (
                  <tr key={doc.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="text-sm font-medium hover:underline truncate max-w-[200px] block"
                      >
                        {doc.file_name}
                      </Link>
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="capitalize text-xs">
                        {doc.document_type?.replace(/_/g, " ") || "unknown"}
                      </Badge>
                    </td>
                    <td className="py-2 px-3">
                      {getStatusBadge(doc.status)}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${getConfidenceColor(doc.extraction_confidence)}`} />
                        <span className="text-sm">
                          {doc.extraction_confidence
                            ? `${Math.round(doc.extraction_confidence * 100)}%`
                            : "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      {doc.flag_count > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {doc.flag_count} flags
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
                {metrics.recentDocuments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No documents found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils/format";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

async function DashboardStats() {
  const supabase = await createClient();

  // Fetch counts in parallel
  const [customersResult, documentsResult, processingResult, failedResult] =
    await Promise.all([
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase.from("documents").select("id", { count: "exact", head: true }),
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("status", "processing"),
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed"),
    ]);

  const stats = [
    {
      title: "Total Customers",
      value: customersResult.count ?? 0,
      icon: Users,
      href: "/customers",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Documents",
      value: documentsResult.count ?? 0,
      icon: FileText,
      href: "/documents",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Processing",
      value: processingResult.count ?? 0,
      icon: Clock,
      href: "/documents?status=processing",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Failed",
      value: failedResult.count ?? 0,
      icon: AlertCircle,
      href: "/documents?status=failed",
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Link key={stat.title} href={stat.href}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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
        </Link>
      ))}
    </div>
  );
}

async function RecentDocuments() {
  const supabase = await createClient();

  const { data: documents } = await supabase
    .from("documents")
    .select("id, file_name, status, document_type, created_at, customers(name)")
    .order("created_at", { ascending: false })
    .limit(5);

  if (!documents || documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No documents yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your first document to get started with OCR extraction
            </p>
            <Link href="/documents/upload">
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusStyles = {
    completed: "bg-emerald-100 text-emerald-800",
    processing: "bg-yellow-100 text-yellow-800",
    pending: "bg-gray-100 text-gray-800",
    failed: "bg-red-100 text-red-800",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recent Documents</CardTitle>
        <Link href="/documents">
          <Button variant="ghost" size="sm">
            View all
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {documents.map((doc) => (
            <Link
              key={doc.id}
              href={`/documents/${doc.id}`}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{doc.file_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(doc.created_at))}
                    {doc.customers && ` • ${doc.customers.name}`}
                  </p>
                </div>
              </div>
              <Badge
                variant="secondary"
                className={statusStyles[doc.status as keyof typeof statusStyles]}
              >
                {doc.status}
              </Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

async function RecentCustomers() {
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, company, email, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (!customers || customers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No customers yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first customer to start managing relationships
            </p>
            <Link href="/customers">
              <Button>
                <Users className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recent Customers</CardTitle>
        <Link href="/customers">
          <Button variant="ghost" size="sm">
            View all
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {customer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{customer.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {customer.company || customer.email || "No details"}
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(customer.created_at))}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your workspace.
          </p>
        </div>
        <Link href="/documents/upload">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </Link>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardStats />
      </Suspense>

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <div className="h-6 w-40 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 bg-muted animate-pulse rounded-lg"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          }
        >
          <RecentDocuments />
        </Suspense>

        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <div className="h-6 w-40 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 bg-muted animate-pulse rounded-lg"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          }
        >
          <RecentCustomers />
        </Suspense>
      </div>
    </div>
  );
}

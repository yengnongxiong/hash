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
  Calendar,
  TrendingUp,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils/format";
import { format, startOfDay, endOfDay, addDays, isPast, isToday } from "date-fns";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

async function DashboardStats() {
  const supabase = await createClient();

  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  // Fetch counts in parallel
  const [customersResult, documentsResult, processingResult, failedResult, completedTodayResult] =
    await Promise.all([
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase.from("documents").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("status", "processing")
        .is("deleted_at", null),
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .is("deleted_at", null),
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .is("deleted_at", null)
        .gte("updated_at", todayStart)
        .lte("updated_at", todayEnd),
    ]);

  const stats = [
    {
      title: "Total Customers",
      value: customersResult.count ?? 0,
      icon: Users,
      href: "/people",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Total Documents",
      value: documentsResult.count ?? 0,
      icon: FileText,
      href: "/documents",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      title: "Completed Today",
      value: completedTodayResult.count ?? 0,
      icon: CheckCircle2,
      href: "/documents?status=completed",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "Needs Attention",
      value: (processingResult.count ?? 0) + (failedResult.count ?? 0),
      icon: AlertCircle,
      href: "/documents?status=failed",
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950",
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

  const { data: rawDocuments } = await supabase
    .from("documents")
    .select("id, file_name, status, document_type, created_at, customer_id")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!rawDocuments || rawDocuments.length === 0) {
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

  // Fetch customers separately for documents that have customer_id
  const customerIds = [...new Set(rawDocuments.filter(d => d.customer_id).map(d => d.customer_id as string))];
  let customersMap: Record<string, { name: string }> = {};

  if (customerIds.length > 0) {
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name")
      .in("id", customerIds);

    if (customers) {
      customersMap = Object.fromEntries(customers.map(c => [c.id, { name: c.name }]));
    }
  }

  // Attach customers to documents
  const documents = rawDocuments.map(doc => ({
    ...doc,
    customers: doc.customer_id ? customersMap[doc.customer_id] || null : null,
  }));

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
            <Link href="/people">
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
        <Link href="/people">
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

async function UpcomingAppointments() {
  const supabase = await createClient();

  const today = startOfDay(new Date()).toISOString();
  const nextWeek = addDays(new Date(), 7).toISOString();

  const { data: rawAppointments } = await supabase
    .from("dates")
    .select("id, title, start_time, status, customer_id")
    .gte("start_time", today)
    .lte("start_time", nextWeek)
    .order("start_time", { ascending: true })
    .limit(5);

  if (!rawAppointments || rawAppointments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1 text-sm">No upcoming appointments</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Schedule appointments with your customers
            </p>
            <Link href="/people/appointments">
              <Button size="sm" variant="outline">
                <Calendar className="h-3 w-3 mr-1" />
                View Calendar
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fetch customers separately for appointments that have customer_id
  const customerIds = [...new Set(rawAppointments.filter(a => a.customer_id).map(a => a.customer_id as string))];
  let customersMap: Record<string, { name: string }> = {};

  if (customerIds.length > 0) {
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name")
      .in("id", customerIds);

    if (customers) {
      customersMap = Object.fromEntries(customers.map(c => [c.id, { name: c.name }]));
    }
  }

  // Attach customers to appointments
  const appointments = rawAppointments.map(apt => ({
    ...apt,
    customers: apt.customer_id ? customersMap[apt.customer_id] || null : null,
  }));

  const statusStyles = {
    scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
        <Link href="/people/appointments">
          <Button variant="ghost" size="sm">
            View all
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
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
              <Badge
                variant="secondary"
                className={statusStyles[apt.status as keyof typeof statusStyles] || statusStyles.scheduled}
              >
                {isToday(new Date(apt.start_time)) ? "Today" : format(new Date(apt.start_time), "EEE")}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ExtractedData {
  dueDate?: string;
  expirationDate?: string;
}

async function UpcomingDueDates() {
  const supabase = await createClient();

  const { data: documents } = await supabase
    .from("documents")
    .select("id, file_name, document_number, extracted_data")
    .eq("status", "completed")
    .is("deleted_at", null)
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

  const today = new Date();
  const thirtyDaysFromNow = addDays(today, 30);

  for (const doc of documents || []) {
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

  // Sort by date
  upcomingDates.sort((a, b) => a.date.getTime() - b.date.getTime());

  const overdueCount = upcomingDates.filter((d) => d.isOverdue).length;

  if (upcomingDates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Due Dates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1 text-sm">No upcoming due dates</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Due dates from documents will appear here
            </p>
            <Link href="/documents/calendar">
              <Button size="sm" variant="outline">
                <Calendar className="h-3 w-3 mr-1" />
                View Calendar
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={overdueCount > 0 ? "border-orange-500/50" : ""}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Upcoming Due Dates</CardTitle>
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
                <div className={`p-2 rounded-lg ${item.isOverdue ? "bg-red-100 dark:bg-red-900" : "bg-muted"}`}>
                  <FileText className={`h-4 w-4 ${item.isOverdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{item.documentName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.type} • {format(item.date, "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <Badge
                variant={item.isOverdue ? "destructive" : "secondary"}
              >
                {item.isOverdue ? "Overdue" : isToday(item.date) ? "Today" : formatDistanceToNow(item.date)}
              </Badge>
            </Link>
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
                      className="h-14 bg-muted animate-pulse rounded-lg"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          }
        >
          <UpcomingAppointments />
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
                      className="h-14 bg-muted animate-pulse rounded-lg"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          }
        >
          <UpcomingDueDates />
        </Suspense>
      </div>
    </div>
  );
}

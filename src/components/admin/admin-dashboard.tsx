"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Building2,
  FileText,
  UserCircle,
  Bell,
  BarChart3,
  LogOut,
  Shield,
  Clock,
  Brain,
  FlaskConical,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { logoutAdmin } from "@/app/admin/actions";
import { toast } from "sonner";

interface AdminDashboardProps {
  stats: {
    users: number;
    organizations: number;
    customers: number;
    documents: number;
    activeAlerts: number;
  };
  recentUsers: Array<{
    id: string;
    email: string;
    name: string | null;
    role: string;
    created_at: string;
    organizations: { name: string } | null;
  }>;
  recentDocuments: Array<{
    id: string;
    file_name: string;
    status: string;
    document_type: string | null;
    created_at: string;
  }>;
}

export function AdminDashboard({ stats, recentUsers, recentDocuments }: AdminDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAdmin();
      toast.success("Logged out of admin panel");
      router.push("/dashboard");
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Hash Admin</h1>
                <p className="text-xs text-slate-400">Platform Management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  Back to App
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={isPending}
                className="text-slate-400 hover:text-white"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <Link href="/admin/alerts">
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Alerts</p>
                  <p className="text-xs text-slate-400">System alerts</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/users">
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Users</p>
                  <p className="text-xs text-slate-400">View all users</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/organizations">
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Organizations</p>
                  <p className="text-xs text-slate-400">View all orgs</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/ai-settings">
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">AI Settings</p>
                  <p className="text-xs text-slate-400">Configure AI</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/experiments">
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                  <FlaskConical className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Experiments</p>
                  <p className="text-xs text-slate-400">A/B testing</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/failed-documents">
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Failed Docs</p>
                  <p className="text-xs text-slate-400">Dead letter queue</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/analytics">
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Analytics</p>
                  <p className="text-xs text-slate-400">Platform stats</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Users className="h-5 w-5 text-blue-500" />
                <Badge variant="secondary">{stats.users}</Badge>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{stats.users}</p>
              <p className="text-xs text-slate-400">Total Users</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Building2 className="h-5 w-5 text-purple-500" />
                <Badge variant="secondary">{stats.organizations}</Badge>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{stats.organizations}</p>
              <p className="text-xs text-slate-400">Organizations</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <UserCircle className="h-5 w-5 text-cyan-500" />
                <Badge variant="secondary">{stats.customers}</Badge>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{stats.customers}</p>
              <p className="text-xs text-slate-400">Customers</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <FileText className="h-5 w-5 text-green-500" />
                <Badge variant="secondary">{stats.documents}</Badge>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{stats.documents}</p>
              <p className="text-xs text-slate-400">Documents</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Bell className="h-5 w-5 text-orange-500" />
                <Badge variant={stats.activeAlerts > 0 ? "destructive" : "secondary"}>
                  {stats.activeAlerts}
                </Badge>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{stats.activeAlerts}</p>
              <p className="text-xs text-slate-400">Active Alerts</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Users */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recent Users
              </CardTitle>
              <CardDescription className="text-slate-400">
                Latest user registrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentUsers.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">No users yet</p>
              ) : (
                <div className="space-y-3">
                  {recentUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {user.name || user.email}
                        </p>
                        <p className="text-xs text-slate-400">
                          {user.organizations?.name || "No org"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(user.created_at), "MMM d")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Documents */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Documents
              </CardTitle>
              <CardDescription className="text-slate-400">
                Latest document uploads
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentDocuments.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">No documents yet</p>
              ) : (
                <div className="space-y-3">
                  {recentDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {doc.file_name}
                        </p>
                        <p className="text-xs text-slate-400 capitalize">
                          {doc.document_type || "Unknown"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={doc.status === "completed" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {doc.status}
                        </Badge>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(doc.created_at), "MMM d")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

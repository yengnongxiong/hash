"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  Building2,
  FileText,
  UserCircle,
  Bell,
  LogOut,
  Shield,
  Clock,
  History,
  Cpu,
  AlertTriangle,
  Trash2,
  Brain,
  FlaskConical,
} from "lucide-react";
import { format } from "date-fns";
import { logoutAdmin, resetDatabaseAdmin } from "@/app/admin/actions";
import { toast } from "sonner";

interface OrgUsage {
  id: string;
  name: string;
  org_code: string | null;
  userCount: number;
  peopleCount: number;
  documentCount: number;
  taskCount: number;
}

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
  orgUsage?: OrgUsage[];
}

export function AdminDashboard({ stats, recentUsers, recentDocuments, orgUsage = [] }: AdminDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isResetting, startResetTransition] = useTransition();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAdmin();
      toast.success("Logged out of admin panel");
      router.push("/login");
    });
  };

  const handleResetDatabase = () => {
    if (confirmText !== "DELETE ALL DATA") {
      toast.error("Please type the confirmation text exactly");
      return;
    }

    startResetTransition(async () => {
      const result = await resetDatabaseAdmin(confirmText);
      if (result.success) {
        toast.success("Database reset successfully");
        setResetDialogOpen(false);
        setConfirmText("");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to reset database");
      }
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
          <Link href="/admin/organizations">
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Organizations</p>
                  <p className="text-xs text-slate-400">Manage orgs</p>
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
          <Link href="/admin/activity">
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <History className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Activity</p>
                  <p className="text-xs text-slate-400">Audit log</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/processing">
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Cpu className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Processing</p>
                  <p className="text-xs text-slate-400">Doc queue</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/ai-settings">
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">AI Settings</p>
                  <p className="text-xs text-slate-400">ML config</p>
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
              <p className="text-xs text-slate-400">People</p>
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

        {/* Organization Usage Stats */}
        {orgUsage.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Usage
              </CardTitle>
              <CardDescription className="text-slate-400">
                Resource usage by organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 px-3 text-sm font-medium text-slate-400">Organization</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-slate-400">Code</th>
                      <th className="text-center py-2 px-3 text-sm font-medium text-slate-400">Users</th>
                      <th className="text-center py-2 px-3 text-sm font-medium text-slate-400">People</th>
                      <th className="text-center py-2 px-3 text-sm font-medium text-slate-400">Documents</th>
                      <th className="text-center py-2 px-3 text-sm font-medium text-slate-400">Tasks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgUsage.map((org) => (
                      <tr key={org.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="py-3 px-3 text-sm text-white">{org.name}</td>
                        <td className="py-3 px-3">
                          <code className="text-xs bg-slate-700 px-2 py-1 rounded font-mono text-cyan-400">
                            {org.org_code || "-"}
                          </code>
                        </td>
                        <td className="py-3 px-3 text-center text-sm text-slate-300">{org.userCount}</td>
                        <td className="py-3 px-3 text-center text-sm text-slate-300">{org.peopleCount}</td>
                        <td className="py-3 px-3 text-center text-sm text-slate-300">{org.documentCount}</td>
                        <td className="py-3 px-3 text-center text-sm text-slate-300">{org.taskCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
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

        {/* Danger Zone */}
        <Card className="bg-slate-800/50 border-red-900/50">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-slate-400">
              Irreversible actions that affect the entire platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg bg-red-950/20 border border-red-900/30">
              <div>
                <p className="text-sm font-medium text-white">Reset Database</p>
                <p className="text-xs text-slate-400">
                  Delete all organizations, users, and data. Only your admin account will be preserved.
                </p>
              </div>
              <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Reset Database
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-red-400 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Reset Database
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                      This action cannot be undone. This will permanently delete all:
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 text-sm text-slate-300 bg-slate-800 rounded-lg p-4">
                    <p>- All organizations and their invite codes</p>
                    <p>- All users (except your admin account)</p>
                    <p>- All people/customers</p>
                    <p>- All documents and their data</p>
                    <p>- All tasks and appointments</p>
                    <p>- All activity logs and alerts</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">
                      Type <span className="font-mono text-red-400">DELETE ALL DATA</span> to confirm:
                    </label>
                    <Input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="DELETE ALL DATA"
                      className="bg-slate-800 border-slate-700 font-mono"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setResetDialogOpen(false);
                        setConfirmText("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleResetDatabase}
                      disabled={confirmText !== "DELETE ALL DATA" || isResetting}
                    >
                      {isResetting ? "Resetting..." : "Reset Database"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

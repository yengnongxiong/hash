"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SystemAlert, Organization } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertTriangle,
  Bell,
  Info,
  Megaphone,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Shield,
  ArrowLeft,
  Globe,
  Building2,
  Search,
  LogOut,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  createSystemAlertAdmin,
  updateSystemAlertAdmin,
  deleteSystemAlertAdmin,
  logoutAdmin,
} from "@/app/admin/actions";
import { cn } from "@/lib/utils";

interface AdminAlertsManagerProps {
  alerts: SystemAlert[];
  organizations: Pick<Organization, "id" | "name">[];
}

const ALERT_TYPE_CONFIG = {
  info: {
    icon: Info,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    label: "Information",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    label: "Warning",
  },
  maintenance: {
    icon: Bell,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    label: "Maintenance",
  },
  critical: {
    icon: Megaphone,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    label: "Critical",
  },
};

export function AdminAlertsManager({ alerts, organizations }: AdminAlertsManagerProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isGlobal, setIsGlobal] = useState(true);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [orgSearch, setOrgSearch] = useState("");

  const filteredOrgs = organizations.filter((org) =>
    org.name.toLowerCase().includes(orgSearch.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("isGlobal", isGlobal.toString());
    formData.set("targetOrganizations", JSON.stringify(selectedOrgs));

    startTransition(async () => {
      const result = await createSystemAlertAdmin(formData);
      if (result.error) {
        toast.error("Failed to create alert", { description: result.error });
      } else {
        toast.success("Alert created successfully");
        setIsOpen(false);
        setSelectedOrgs([]);
        setIsGlobal(true);
      }
    });
  };

  const handleToggleActive = async (alert: SystemAlert) => {
    startTransition(async () => {
      const result = await updateSystemAlertAdmin(alert.id, { active: !alert.active });
      if (result.error) {
        toast.error("Failed to update alert", { description: result.error });
      } else {
        toast.success(alert.active ? "Alert deactivated" : "Alert activated");
      }
    });
  };

  const handleDelete = async (alertId: string) => {
    if (!confirm("Are you sure you want to delete this alert?")) return;

    startTransition(async () => {
      const result = await deleteSystemAlertAdmin(alertId);
      if (result.error) {
        toast.error("Failed to delete alert", { description: result.error });
      } else {
        toast.success("Alert deleted");
      }
    });
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAdmin();
      toast.success("Logged out of admin panel");
      router.push("/dashboard");
    });
  };

  const toggleOrgSelection = (orgId: string) => {
    setSelectedOrgs((prev) =>
      prev.includes(orgId)
        ? prev.filter((id) => id !== orgId)
        : [...prev, orgId]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">System Alerts</h1>
                <p className="text-xs text-slate-400">Create and manage alerts</p>
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-slate-400">
              {alerts.length} alert{alerts.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1">
                <Plus className="h-4 w-4" />
                New Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Create System Alert</DialogTitle>
                  <DialogDescription>
                    Send a maintenance notice or important update
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="alertType">Alert Type</Label>
                    <Select name="alertType" defaultValue="info">
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">
                          <span className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-blue-500" />
                            Information
                          </span>
                        </SelectItem>
                        <SelectItem value="warning">
                          <span className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            Warning
                          </span>
                        </SelectItem>
                        <SelectItem value="maintenance">
                          <span className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-orange-500" />
                            Maintenance
                          </span>
                        </SelectItem>
                        <SelectItem value="critical">
                          <span className="flex items-center gap-2">
                            <Megaphone className="h-4 w-4 text-red-500" />
                            Critical
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="Scheduled Maintenance"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="We will be performing scheduled maintenance on..."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startsAt">Starts At</Label>
                      <Input
                        id="startsAt"
                        name="startsAt"
                        type="datetime-local"
                        defaultValue={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endsAt">Ends At (optional)</Label>
                      <Input
                        id="endsAt"
                        name="endsAt"
                        type="datetime-local"
                      />
                    </div>
                  </div>

                  {/* Target Selection */}
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Global Alert</Label>
                        <p className="text-xs text-muted-foreground">
                          Show to all organizations
                        </p>
                      </div>
                      <Switch
                        checked={isGlobal}
                        onCheckedChange={setIsGlobal}
                      />
                    </div>

                    {!isGlobal && (
                      <div className="space-y-2">
                        <Label>Target Organizations</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search organizations..."
                            value={orgSearch}
                            onChange={(e) => setOrgSearch(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        <div className="border rounded-lg max-h-40 overflow-y-auto">
                          {filteredOrgs.length === 0 ? (
                            <p className="p-3 text-sm text-muted-foreground text-center">
                              No organizations found
                            </p>
                          ) : (
                            filteredOrgs.map((org) => (
                              <div
                                key={org.id}
                                className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer"
                                onClick={() => toggleOrgSelection(org.id)}
                              >
                                <Checkbox
                                  checked={selectedOrgs.includes(org.id)}
                                  onCheckedChange={() => toggleOrgSelection(org.id)}
                                />
                                <span className="text-sm">{org.name}</span>
                              </div>
                            ))
                          )}
                        </div>
                        {selectedOrgs.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {selectedOrgs.length} organization{selectedOrgs.length !== 1 ? "s" : ""} selected
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Creating..." : "Create Alert"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Alerts List */}
        {alerts.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-slate-600" />
              <p className="text-white font-medium">No alerts created yet</p>
              <p className="text-slate-400 text-sm">Create an alert to notify users</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => {
              const config = ALERT_TYPE_CONFIG[alert.alert_type as keyof typeof ALERT_TYPE_CONFIG] || ALERT_TYPE_CONFIG.info;
              const Icon = config.icon;
              const isTargeted = alert.target_organization_ids && alert.target_organization_ids.length > 0;

              return (
                <Card
                  key={alert.id}
                  className={cn(
                    "bg-slate-800/50 border-slate-700",
                    !alert.active && "opacity-60"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={cn("p-2 rounded-lg", config.bgColor)}>
                        <Icon className={cn("h-5 w-5", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-medium text-white">{alert.title}</h3>
                          <Badge variant={alert.active ? "default" : "secondary"}>
                            {alert.active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">{config.label}</Badge>
                          {isTargeted ? (
                            <Badge variant="outline" className="gap-1">
                              <Building2 className="h-3 w-3" />
                              {alert.target_organization_ids.length} org{alert.target_organization_ids.length !== 1 ? "s" : ""}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <Globe className="h-3 w-3" />
                              Global
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mb-2">{alert.message}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>
                            Starts: {format(new Date(alert.starts_at || alert.created_at), "MMM d, yyyy h:mm a")}
                          </span>
                          {alert.ends_at && (
                            <span>
                              Ends: {format(new Date(alert.ends_at), "MMM d, yyyy h:mm a")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-white"
                          onClick={() => handleToggleActive(alert)}
                          disabled={isPending}
                          title={alert.active ? "Deactivate" : "Activate"}
                        >
                          {alert.active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-300"
                          onClick={() => handleDelete(alert.id)}
                          disabled={isPending}
                          title="Delete alert"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

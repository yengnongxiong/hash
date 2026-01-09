"use client";

import { useState, useMemo, useCallback, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppointmentWithRelations, AppointmentType, Customer } from "@/types/database";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CreateAppointmentDialog } from "@/components/customers/appointments/create-appointment-dialog";
import { AppointmentDetailDialog } from "./appointment-detail-dialog";
import { AppointmentTypesDialog } from "./appointment-types-dialog";
import { DatesCalendar } from "./dates-calendar";
import { DatesWeekView } from "./dates-week-view";
import { DatesCSVImportDialog } from "./csv-import-dialog";
import { exportToCSV, formatDateTime } from "@/lib/export";
import { updateAppointment, bulkUpdateAppointmentStatus, bulkDeleteAppointments } from "@/app/(dashboard)/dates/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  List,
  Calendar as CalendarIcon,
  CalendarDays,
  Search,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Circle,
  Download,
  Check,
  Trash2,
  X,
} from "lucide-react";
import {
  format,
  isPast,
  isToday,
  isFuture,
  startOfDay,
} from "date-fns";
import { formatDistanceToNow } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type SortKey = "date" | "title" | "person" | "type" | "status" | "created" | "updated";
type SortDirection = "asc" | "desc" | null;

export interface OrganizationMember {
  id: string;
  name: string | null;
  email: string;
}

interface DatesViewProps {
  appointments: AppointmentWithRelations[];
  customers: Pick<Customer, "id" | "name" | "company" | "customer_number">[];
  appointmentTypes: AppointmentType[];
  organizationMembers: OrganizationMember[];
}

type TimeFilter = "all" | "overdue" | "today" | "upcoming" | "past";

// Helper to get computed status for sorting/filtering
function getComputedStatus(apt: AppointmentWithRelations): string {
  if (apt.status === "cancelled") return "cancelled";
  if (apt.status === "completed") return "completed";
  const startDate = new Date(apt.start_time);
  const isOverdue = isPast(startOfDay(startDate)) && !isToday(startDate);
  const isTodayDate = isToday(startDate);
  if (isOverdue) return "overdue";
  if (isTodayDate) return "today";
  return "upcoming";
}

const DATES_VIEW_STORAGE_KEY = "hash-dates-preferred-view";

export function DatesView({ appointments, customers, appointmentTypes, organizationMembers }: DatesViewProps) {
  const [view, setView] = useState<"table" | "week" | "calendar">("table");
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  // State for creating appointment from calendar
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  // State for bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Load saved view preference from localStorage on mount
  useEffect(() => {
    const savedView = localStorage.getItem(DATES_VIEW_STORAGE_KEY);
    if (savedView && ["table", "week", "calendar"].includes(savedView)) {
      setView(savedView as "table" | "week" | "calendar");
    }
  }, []);

  // Save view preference to localStorage when it changes
  const handleViewChange = useCallback((newView: "table" | "week" | "calendar") => {
    setView(newView);
    localStorage.setItem(DATES_VIEW_STORAGE_KEY, newView);
  }, []);

  // Quick status change handler
  const handleQuickStatusChange = useCallback((
    aptId: string,
    newStatus: "scheduled" | "completed" | "cancelled",
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    startTransition(async () => {
      const result = await updateAppointment(aptId, { status: newStatus });
      if (result.error) {
        toast.error("Failed to update status", { description: result.error });
      } else {
        toast.success(`Status changed to ${newStatus}`);
        router.refresh();
      }
    });
  }, [router]);

  // Handle date move (drag-and-drop)
  const handleDateMove = useCallback(
    (entryId: string, newDate: Date) => {
      startTransition(async () => {
        // Find the appointment to get its end_time and calculate the new end_time
        const apt = appointments.find((a) => a.id === entryId);
        if (!apt) return;

        // Calculate new end_time if original had one
        let newEndTime: string | null = null;
        if (apt.end_time) {
          const originalDuration =
            new Date(apt.end_time).getTime() - new Date(apt.start_time).getTime();
          newEndTime = new Date(newDate.getTime() + originalDuration).toISOString();
        }

        const result = await updateAppointment(entryId, {
          start_time: newDate.toISOString(),
          end_time: newEndTime,
        });

        if (result.error) {
          toast.error("Failed to reschedule date", { description: result.error });
        } else {
          toast.success("Date rescheduled");
          router.refresh();
        }
      });
    },
    [appointments, router]
  );

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      // Search filter - includes formatted dates
      if (search) {
        const searchLower = search.toLowerCase();
        const startDate = new Date(apt.start_time);
        const formattedDate = format(startDate, "MMM d, yyyy").toLowerCase();
        const formattedTime = format(startDate, "h:mm a").toLowerCase();
        const computedStatus = getComputedStatus(apt);

        const matchesSearch =
          apt.title.toLowerCase().includes(searchLower) ||
          apt.customers?.name?.toLowerCase().includes(searchLower) ||
          apt.customers?.company?.toLowerCase().includes(searchLower) ||
          apt.location?.toLowerCase().includes(searchLower) ||
          apt.description?.toLowerCase().includes(searchLower) ||
          apt.appointment_types?.name?.toLowerCase().includes(searchLower) ||
          formattedDate.includes(searchLower) ||
          formattedTime.includes(searchLower) ||
          computedStatus.includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Time filter
      const today = startOfDay(new Date());
      const aptDate = startOfDay(new Date(apt.start_time));

      switch (timeFilter) {
        case "overdue":
          if (!isPast(aptDate) || isToday(aptDate)) return false;
          break;
        case "today":
          if (!isToday(aptDate)) return false;
          break;
        case "upcoming":
          // Upcoming should only show future dates, not today
          if (!isFuture(aptDate)) return false;
          break;
        case "past":
          if (!isPast(aptDate)) return false;
          break;
      }

      return true;
    });
  }, [appointments, search, timeFilter]);

  // Sorted appointments
  const sortedAppointments = useMemo(() => {
    return [...filteredAppointments].sort((a, b) => {
      let comparison = 0;

      // Default sort by updated_at descending when no column is selected
      if (!sortKey) {
        comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        return -comparison; // descending (most recent first)
      }

      switch (sortKey) {
        case "date":
          comparison = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "person":
          const nameA = a.customers?.name || "";
          const nameB = b.customers?.name || "";
          comparison = nameA.localeCompare(nameB);
          break;
        case "type":
          const typeA = a.appointment_types?.name || "";
          const typeB = b.appointment_types?.name || "";
          comparison = typeA.localeCompare(typeB);
          break;
        case "status":
          const statusOrder = { overdue: 0, today: 1, upcoming: 2, completed: 3, cancelled: 4 };
          const statusA = getComputedStatus(a);
          const statusB = getComputedStatus(b);
          comparison = (statusOrder[statusA as keyof typeof statusOrder] || 5) -
                       (statusOrder[statusB as keyof typeof statusOrder] || 5);
          break;
        case "created":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "updated":
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredAppointments, sortKey, sortDirection]);

  // Bulk selection handlers (must be after sortedAppointments)
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === sortedAppointments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedAppointments.map((apt) => apt.id)));
    }
  }, [sortedAppointments, selectedIds.size]);

  const handleSelectOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkStatusChange = useCallback(
    (status: "scheduled" | "completed" | "cancelled") => {
      if (selectedIds.size === 0) return;
      startTransition(async () => {
        const result = await bulkUpdateAppointmentStatus(
          Array.from(selectedIds),
          status
        );
        if (result.error) {
          toast.error("Failed to update status", { description: result.error });
        } else {
          toast.success(`Updated ${result.count} dates to ${status}`);
          setSelectedIds(new Set());
          router.refresh();
        }
      });
    },
    [selectedIds, router]
  );

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    startTransition(async () => {
      const result = await bulkDeleteAppointments(Array.from(selectedIds));
      if (result.error) {
        toast.error("Failed to delete dates", { description: result.error });
      } else {
        toast.success(`Deleted ${result.count} dates`);
        setSelectedIds(new Set());
        router.refresh();
      }
    });
  }, [selectedIds, router]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      // Cycle: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const SortableHeader = ({ sortKeyName, children }: { sortKeyName: SortKey; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(sortKeyName)}
    >
      <span>{children}</span>
      {sortKey === sortKeyName && sortDirection === "desc" ? (
        <ArrowDown className="ml-2 h-4 w-4" />
      ) : sortKey === sortKeyName && sortDirection === "asc" ? (
        <ArrowUp className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      )}
    </Button>
  );

  // Stats
  const overdueCount = appointments.filter(
    (apt) => isPast(startOfDay(new Date(apt.start_time))) && !isToday(new Date(apt.start_time)) && apt.status === "scheduled"
  ).length;
  const todayCount = appointments.filter((apt) => isToday(new Date(apt.start_time))).length;
  const upcomingCount = appointments.filter(
    (apt) => isFuture(startOfDay(new Date(apt.start_time)))
  ).length;

  // Convert appointments to date entries for calendar
  const calendarDates = useMemo(() => {
    return sortedAppointments.map((apt) => ({
      id: apt.id,
      title: apt.title,
      date: new Date(apt.start_time),
      endDate: apt.end_time ? new Date(apt.end_time) : undefined,
      color: apt.appointment_types?.color || undefined,
      entityName: apt.customers?.name,
      location: apt.location || undefined,
      status: apt.status,
    }));
  }, [sortedAppointments]);

  const handleViewAppointment = (apt: AppointmentWithRelations) => {
    setSelectedAppointment(apt);
    setDetailDialogOpen(true);
  };

  const handleEmptyDayClick = (date: Date) => {
    setSelectedDate(date);
    setCreateDialogOpen(true);
  };

  const handleExport = useCallback(() => {
    exportToCSV(sortedAppointments, "dates", [
      { key: "title", label: "Title" },
      { key: "start_time", label: "Date", format: (v) => formatDateTime(v as string) },
      { key: "end_time", label: "End Time", format: (v) => v ? formatDateTime(v as string) : "" },
      { key: "customers", label: "Person", format: (v) => {
        const customer = v as AppointmentWithRelations["customers"];
        return customer?.name || "";
      }},
      { key: "appointment_types", label: "Type", format: (v) => {
        const type = v as AppointmentWithRelations["appointment_types"];
        return type?.name || "";
      }},
      { key: "location", label: "Location", format: (v) => (v as string) || "" },
      { key: "description", label: "Description", format: (v) => (v as string) || "" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Created", format: (v) => formatDateTime(v as string) },
      { key: "updated_at", label: "Updated", format: (v) => formatDateTime(v as string) },
    ]);
  }, [sortedAppointments]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setTimeFilter(timeFilter === "overdue" ? "all" : "overdue")}
          className={cn(
            "p-4 rounded-lg border text-left transition-colors",
            timeFilter === "overdue"
              ? "border-red-500 bg-red-500/10"
              : "hover:bg-muted"
          )}
        >
          <p className="text-sm text-muted-foreground">Overdue</p>
          <p className={cn("text-2xl font-bold", overdueCount > 0 && "text-red-500")}>
            {overdueCount}
          </p>
        </button>
        <button
          onClick={() => setTimeFilter(timeFilter === "today" ? "all" : "today")}
          className={cn(
            "p-4 rounded-lg border text-left transition-colors",
            timeFilter === "today"
              ? "border-blue-500 bg-blue-500/10"
              : "hover:bg-muted"
          )}
        >
          <p className="text-sm text-muted-foreground">Today</p>
          <p className="text-2xl font-bold">{todayCount}</p>
        </button>
        <button
          onClick={() => setTimeFilter(timeFilter === "upcoming" ? "all" : "upcoming")}
          className={cn(
            "p-4 rounded-lg border text-left transition-colors",
            timeFilter === "upcoming"
              ? "border-green-500 bg-green-500/10"
              : "hover:bg-muted"
          )}
        >
          <p className="text-sm text-muted-foreground">Upcoming</p>
          <p className="text-2xl font-bold">{upcomingCount}</p>
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search dates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* View Toggle */}
        <Tabs value={view} onValueChange={(v) => handleViewChange(v as "table" | "week" | "calendar")}>
          <TabsList>
            <TabsTrigger value="table" className="gap-1.5">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-1.5">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Week</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5">
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Month</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Manage Types */}
        <AppointmentTypesDialog appointmentTypes={appointmentTypes} />

        {/* Import */}
        <DatesCSVImportDialog customers={customers} appointmentTypes={appointmentTypes} />

        {/* Export */}
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>

        {/* Create Appointment */}
        <CreateAppointmentDialog customers={customers} appointmentTypes={appointmentTypes} organizationMembers={organizationMembers} />
      </div>

      {/* Results count and bulk actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {sortedAppointments.length} of {appointments.length} dates
          {timeFilter !== "all" && ` (${timeFilter})`}
        </p>

        {/* Bulk action bar - shown when items selected */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
            <div className="h-4 w-px bg-border" />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" disabled={isPending}>
                  Set Status
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1" align="end">
                <div className="flex flex-col">
                  <button
                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left"
                    onClick={() => handleBulkStatusChange("scheduled")}
                  >
                    Scheduled
                  </button>
                  <button
                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left"
                    onClick={() => handleBulkStatusChange("completed")}
                  >
                    Completed
                  </button>
                  <button
                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left"
                    onClick={() => handleBulkStatusChange("cancelled")}
                  >
                    Cancelled
                  </button>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleBulkDelete}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              disabled={isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {view === "table" ? (
        <div className="border rounded-lg overflow-x-auto">
          {sortedAppointments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No dates found</p>
              <p className="text-sm">Try adjusting your filters or create a new date</p>
            </div>
          ) : (
            <table className="w-full table-fixed min-w-[950px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 w-[40px] text-center align-middle">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={
                          sortedAppointments.length > 0 &&
                          selectedIds.size === sortedAppointments.length
                        }
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </div>
                  </th>
                  <th className="text-left p-3 text-sm font-medium w-[140px]">
                    <SortableHeader sortKeyName="date">Date & Time</SortableHeader>
                  </th>
                  <th className="text-left p-3 text-sm font-medium w-[180px]">
                    <SortableHeader sortKeyName="title">Title</SortableHeader>
                  </th>
                  <th className="text-left p-3 text-sm font-medium w-[130px]">
                    <SortableHeader sortKeyName="person">Person</SortableHeader>
                  </th>
                  <th className="text-left p-3 text-sm font-medium w-[100px]">
                    <SortableHeader sortKeyName="type">Type</SortableHeader>
                  </th>
                  <th className="text-left p-3 text-sm font-medium w-[100px]">
                    <SortableHeader sortKeyName="status">Status</SortableHeader>
                  </th>
                  <th className="text-left p-3 text-sm font-medium w-[80px]">
                    <SortableHeader sortKeyName="created">Created</SortableHeader>
                  </th>
                  <th className="text-left p-3 text-sm font-medium w-[80px]">
                    <SortableHeader sortKeyName="updated">Updated</SortableHeader>
                  </th>
                  <th className="w-[70px] p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedAppointments.map((apt) => {
                  const startDate = new Date(apt.start_time);
                  const computedStatus = getComputedStatus(apt);
                  const isOverdue = computedStatus === "overdue";

                  return (
                    <tr
                      key={apt.id}
                      className={cn(
                        "hover:bg-muted/30 cursor-pointer",
                        isOverdue && "bg-red-500/5",
                        selectedIds.has(apt.id) && "bg-primary/5"
                      )}
                      onClick={() => handleViewAppointment(apt)}
                    >
                      <td className="p-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedIds.has(apt.id)}
                            onCheckedChange={() => handleSelectOne(apt.id)}
                            aria-label={`Select ${apt.title}`}
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {/* Type indicator: blank circle if no type, colored if type exists */}
                          {apt.appointment_types ? (
                            <div className={cn("w-2 h-2 rounded-full", apt.appointment_types.color)} />
                          ) : (
                            <Circle className="w-2 h-2 text-muted-foreground/50" />
                          )}
                          <div>
                            <p className={cn("font-medium text-sm", isOverdue && "text-red-500")}>
                              {format(startDate, "MMM d, yyyy")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(startDate, "h:mm a")}
                              {apt.end_time && ` - ${format(new Date(apt.end_time), "h:mm a")}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 max-w-0">
                        <p className="font-medium text-sm truncate">
                          {apt.title}
                        </p>
                        {apt.location && (
                          <p className="text-xs text-muted-foreground truncate">
                            {apt.location}
                          </p>
                        )}
                      </td>
                      <td className="p-3 text-sm max-w-0">
                        {apt.customers ? (
                          <div className="min-w-0">
                            <p className="truncate">{apt.customers.name}</p>
                            {apt.customers.company && (
                              <p className="text-xs text-muted-foreground truncate">{apt.customers.company}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3 max-w-0">
                        {apt.appointment_types ? (
                          <Badge variant="outline" className="gap-1.5 max-w-full truncate">
                            <div className={cn("w-2 h-2 rounded-full shrink-0", apt.appointment_types.color)} />
                            <span className="truncate">{apt.appointment_types.name}</span>
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {/* Clickable status badge */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
                              onClick={(e) => e.stopPropagation()}
                              disabled={isPending}
                            >
                              {computedStatus === "cancelled" ? (
                                <Badge variant="secondary" className="cursor-pointer hover:opacity-80">Cancelled</Badge>
                              ) : computedStatus === "completed" ? (
                                <Badge className="bg-green-500 hover:bg-green-600 cursor-pointer">Completed</Badge>
                              ) : computedStatus === "overdue" ? (
                                <Badge variant="destructive" className="cursor-pointer hover:opacity-80">Overdue</Badge>
                              ) : computedStatus === "today" ? (
                                <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black cursor-pointer">Today</Badge>
                              ) : (
                                <Badge className="bg-blue-500 hover:bg-blue-600 cursor-pointer">Upcoming</Badge>
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40 p-1" align="start">
                            <div className="flex flex-col">
                              <button
                                className={cn(
                                  "flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left",
                                  apt.status === "scheduled" && "font-medium"
                                )}
                                onClick={(e) => handleQuickStatusChange(apt.id, "scheduled", e)}
                              >
                                {apt.status === "scheduled" && <Check className="h-3 w-3" />}
                                <span className={apt.status === "scheduled" ? "" : "ml-5"}>Scheduled</span>
                              </button>
                              <button
                                className={cn(
                                  "flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left",
                                  apt.status === "completed" && "font-medium"
                                )}
                                onClick={(e) => handleQuickStatusChange(apt.id, "completed", e)}
                              >
                                {apt.status === "completed" && <Check className="h-3 w-3" />}
                                <span className={apt.status === "completed" ? "" : "ml-5"}>Completed</span>
                              </button>
                              <button
                                className={cn(
                                  "flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left",
                                  apt.status === "cancelled" && "font-medium"
                                )}
                                onClick={(e) => handleQuickStatusChange(apt.id, "cancelled", e)}
                              >
                                {apt.status === "cancelled" && <Check className="h-3 w-3" />}
                                <span className={apt.status === "cancelled" ? "" : "ml-5"}>Cancelled</span>
                              </button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(apt.created_at))}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(apt.updated_at))}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewAppointment(apt);
                          }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : view === "week" ? (
        <DatesWeekView
          dates={calendarDates}
          onDateClick={(apt) => {
            const fullApt = appointments.find((a) => a.id === apt.id);
            if (fullApt) handleViewAppointment(fullApt);
          }}
          onEmptySlotClick={handleEmptyDayClick}
          onDateMove={handleDateMove}
        />
      ) : (
        <DatesCalendar
          dates={calendarDates}
          onDateClick={(apt) => {
            const fullApt = appointments.find((a) => a.id === apt.id);
            if (fullApt) handleViewAppointment(fullApt);
          }}
          onEmptyDayClick={handleEmptyDayClick}
        />
      )}

      {/* Appointment Detail Dialog */}
      <AppointmentDetailDialog
        appointment={selectedAppointment}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        customers={customers}
        appointmentTypes={appointmentTypes}
        organizationMembers={organizationMembers}
      />

      {/* Create Dialog from Calendar */}
      <CreateAppointmentDialog
        customers={customers}
        appointmentTypes={appointmentTypes}
        organizationMembers={organizationMembers}
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setSelectedDate(undefined);
        }}
        defaultDate={selectedDate}
      />
    </div>
  );
}

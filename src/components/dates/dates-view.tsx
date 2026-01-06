"use client";

import { useState, useMemo } from "react";
import { AppointmentWithRelations, AppointmentType, Customer } from "@/types/database";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CreateAppointmentDialog } from "@/components/customers/appointments/create-appointment-dialog";
import { AppointmentDetailDialog } from "./appointment-detail-dialog";
import { AppointmentTypesDialog } from "./appointment-types-dialog";
import { DatesCalendar } from "./dates-calendar";
import {
  List,
  Calendar as CalendarIcon,
  Search,
  Settings,
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

interface DatesViewProps {
  appointments: AppointmentWithRelations[];
  customers: Pick<Customer, "id" | "name" | "company">[];
  appointmentTypes: AppointmentType[];
}

type TimeFilter = "all" | "overdue" | "today" | "upcoming" | "past";

export function DatesView({ appointments, customers, appointmentTypes }: DatesViewProps) {
  const [view, setView] = useState<"table" | "calendar">("table");
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          apt.title.toLowerCase().includes(searchLower) ||
          apt.customers?.name?.toLowerCase().includes(searchLower) ||
          apt.customers?.company?.toLowerCase().includes(searchLower) ||
          apt.location?.toLowerCase().includes(searchLower) ||
          apt.description?.toLowerCase().includes(searchLower) ||
          apt.appointment_types?.name?.toLowerCase().includes(searchLower);
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
          if (!isFuture(aptDate) && !isToday(aptDate)) return false;
          break;
        case "past":
          if (!isPast(aptDate)) return false;
          break;
      }

      return true;
    });
  }, [appointments, search, timeFilter]);

  // Stats
  const overdueCount = appointments.filter(
    (apt) => isPast(startOfDay(new Date(apt.start_time))) && !isToday(new Date(apt.start_time)) && apt.status === "scheduled"
  ).length;
  const todayCount = appointments.filter((apt) => isToday(new Date(apt.start_time))).length;
  const upcomingCount = appointments.filter(
    (apt) => isFuture(startOfDay(new Date(apt.start_time))) || isToday(new Date(apt.start_time))
  ).length;

  // Convert appointments to date entries for calendar
  const calendarDates = useMemo(() => {
    return filteredAppointments.map((apt) => ({
      id: apt.id,
      title: apt.title,
      date: new Date(apt.start_time),
      endDate: apt.end_time ? new Date(apt.end_time) : undefined,
      color: apt.appointment_types?.color || "bg-blue-500",
      entityName: apt.customers?.name,
      location: apt.location || undefined,
    }));
  }, [filteredAppointments]);

  const handleViewAppointment = (apt: AppointmentWithRelations) => {
    setSelectedAppointment(apt);
    setDetailDialogOpen(true);
  };

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
            placeholder="Search appointments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* View Toggle */}
        <Tabs value={view} onValueChange={(v) => setView(v as "table" | "calendar")}>
          <TabsList>
            <TabsTrigger value="table" className="gap-1.5">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5">
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Calendar</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Manage Types */}
        <AppointmentTypesDialog appointmentTypes={appointmentTypes} />

        {/* Create Appointment */}
        <CreateAppointmentDialog customers={customers} appointmentTypes={appointmentTypes} />
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredAppointments.length} of {appointments.length} appointments
        {timeFilter !== "all" && ` (${timeFilter})`}
      </p>

      {/* Content */}
      {view === "table" ? (
        <div className="border rounded-lg overflow-hidden">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No appointments found</p>
              <p className="text-sm">Try adjusting your filters or create a new appointment</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Date & Time</th>
                  <th className="text-left p-3 text-sm font-medium">Title</th>
                  <th className="text-left p-3 text-sm font-medium">Person</th>
                  <th className="text-left p-3 text-sm font-medium">Type</th>
                  <th className="text-left p-3 text-sm font-medium">Status</th>
                  <th className="text-left p-3 text-sm font-medium">Created</th>
                  <th className="text-left p-3 text-sm font-medium">Updated</th>
                  <th className="w-20 p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredAppointments.map((apt) => {
                  const startDate = new Date(apt.start_time);
                  const isOverdue = isPast(startOfDay(startDate)) && !isToday(startDate) && apt.status === "scheduled";
                  const isTodayDate = isToday(startDate);
                  const typeColor = apt.appointment_types?.color || "bg-blue-500";

                  return (
                    <tr
                      key={apt.id}
                      className={cn(
                        "hover:bg-muted/30 cursor-pointer",
                        isOverdue && "bg-red-500/5"
                      )}
                      onClick={() => handleViewAppointment(apt)}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", typeColor)} />
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
                      <td className="p-3">
                        <p className="font-medium text-sm truncate max-w-[200px]">
                          {apt.title}
                        </p>
                        {apt.location && (
                          <p className="text-xs text-muted-foreground truncate">
                            {apt.location}
                          </p>
                        )}
                      </td>
                      <td className="p-3 text-sm">
                        {apt.customers ? (
                          <div>
                            <p>{apt.customers.name}</p>
                            {apt.customers.company && (
                              <p className="text-xs text-muted-foreground">{apt.customers.company}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {apt.appointment_types ? (
                          <Badge variant="outline" className="gap-1.5">
                            <div className={cn("w-2 h-2 rounded-full", apt.appointment_types.color)} />
                            {apt.appointment_types.name}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {apt.status === "cancelled" ? (
                          <Badge variant="secondary">Cancelled</Badge>
                        ) : apt.status === "completed" ? (
                          <Badge variant="outline">Completed</Badge>
                        ) : isOverdue ? (
                          <Badge variant="destructive">Overdue</Badge>
                        ) : isTodayDate ? (
                          <Badge variant="default">Today</Badge>
                        ) : (
                          <Badge variant="secondary">
                            {formatDistanceToNow(startDate)}
                          </Badge>
                        )}
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
      ) : (
        <DatesCalendar
          dates={calendarDates}
          onDateClick={(apt) => {
            const fullApt = appointments.find((a) => a.id === apt.id);
            if (fullApt) handleViewAppointment(fullApt);
          }}
        />
      )}

      {/* Appointment Detail Dialog */}
      <AppointmentDetailDialog
        appointment={selectedAppointment}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        customers={customers}
        appointmentTypes={appointmentTypes}
      />
    </div>
  );
}

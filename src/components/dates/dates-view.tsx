"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Appointment, Customer } from "@/types/database";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateAppointmentDialog } from "@/components/customers/appointments/create-appointment-dialog";
import { DatesCalendar } from "./dates-calendar";
import {
  List,
  Calendar as CalendarIcon,
  Search,
  FileText,
  Users,
  Filter,
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

type AppointmentWithCustomer = Appointment & {
  customers?: { name: string; company: string | null } | null;
};

interface DateEntry {
  id: string;
  type: "appointment" | "document";
  title: string;
  date: Date;
  endDate?: Date;
  category: string;
  entityId: string;
  entityName?: string;
  status?: string;
  location?: string;
}

interface DatesViewProps {
  dates: DateEntry[];
  appointments: AppointmentWithCustomer[];
  customers: Pick<Customer, "id" | "name" | "company">[];
}

const CATEGORY_COLORS: Record<string, string> = {
  appointment: "bg-blue-500",
  due_date: "bg-red-500",
  expiration: "bg-orange-500",
  invoice_date: "bg-purple-500",
  effective: "bg-green-500",
  transaction: "bg-indigo-500",
  other: "bg-gray-500",
};

const CATEGORY_LABELS: Record<string, string> = {
  appointment: "Appointment",
  due_date: "Due Date",
  expiration: "Expiration",
  invoice_date: "Invoice Date",
  effective: "Effective Date",
  transaction: "Transaction",
  other: "Other",
};

type TimeFilter = "all" | "overdue" | "today" | "upcoming" | "past";
type TypeFilter = "all" | "appointment" | "document";

export function DatesView({ dates, appointments, customers }: DatesViewProps) {
  const [view, setView] = useState<"table" | "calendar">("table");
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const filteredDates = useMemo(() => {
    return dates.filter((entry) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          entry.title.toLowerCase().includes(searchLower) ||
          entry.entityName?.toLowerCase().includes(searchLower) ||
          entry.category.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Time filter
      const today = startOfDay(new Date());
      const entryDate = startOfDay(entry.date);

      switch (timeFilter) {
        case "overdue":
          if (!isPast(entryDate) || isToday(entryDate)) return false;
          break;
        case "today":
          if (!isToday(entryDate)) return false;
          break;
        case "upcoming":
          if (!isFuture(entryDate) && !isToday(entryDate)) return false;
          break;
        case "past":
          if (!isPast(entryDate)) return false;
          break;
      }

      // Type filter
      if (typeFilter !== "all" && entry.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [dates, search, timeFilter, typeFilter]);

  // Stats
  const overdueCount = dates.filter(
    (d) => isPast(startOfDay(d.date)) && !isToday(d.date)
  ).length;
  const todayCount = dates.filter((d) => isToday(d.date)).length;
  const upcomingCount = dates.filter(
    (d) => isFuture(startOfDay(d.date)) || isToday(d.date)
  ).length;

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

        {/* Type Filter */}
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as TypeFilter)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="appointment">Appointments</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
          </SelectContent>
        </Select>

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

        {/* Create Appointment */}
        <CreateAppointmentDialog customers={customers} />
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredDates.length} of {dates.length} dates
        {timeFilter !== "all" && ` (${timeFilter})`}
      </p>

      {/* Content */}
      {view === "table" ? (
        <div className="border rounded-lg overflow-hidden">
          {filteredDates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No dates found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Date</th>
                  <th className="text-left p-3 text-sm font-medium">Title</th>
                  <th className="text-left p-3 text-sm font-medium">Type</th>
                  <th className="text-left p-3 text-sm font-medium">Category</th>
                  <th className="text-left p-3 text-sm font-medium">Status</th>
                  <th className="w-20 p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredDates.map((entry) => {
                  const isOverdue = isPast(startOfDay(entry.date)) && !isToday(entry.date);
                  const isTodayDate = isToday(entry.date);

                  return (
                    <tr
                      key={entry.id}
                      className={cn(
                        "hover:bg-muted/30",
                        isOverdue && "bg-red-500/5"
                      )}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full",
                              CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.other
                            )}
                          />
                          <div>
                            <p className={cn("font-medium text-sm", isOverdue && "text-red-500")}>
                              {format(entry.date, "MMM d, yyyy")}
                            </p>
                            {entry.endDate && (
                              <p className="text-xs text-muted-foreground">
                                {format(entry.date, "h:mm a")} - {format(entry.endDate, "h:mm a")}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-sm truncate max-w-[200px]">
                          {entry.title}
                        </p>
                        {entry.entityName && (
                          <p className="text-xs text-muted-foreground">
                            {entry.entityName}
                          </p>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="gap-1">
                          {entry.type === "appointment" ? (
                            <Users className="h-3 w-3" />
                          ) : (
                            <FileText className="h-3 w-3" />
                          )}
                          {entry.type === "appointment" ? "Appointment" : "Document"}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">
                        {CATEGORY_LABELS[entry.category] || entry.category}
                      </td>
                      <td className="p-3">
                        {isOverdue ? (
                          <Badge variant="destructive">Overdue</Badge>
                        ) : isTodayDate ? (
                          <Badge variant="default">Today</Badge>
                        ) : (
                          <Badge variant="secondary">
                            {formatDistanceToNow(entry.date)}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <Link
                          href={
                            entry.type === "appointment"
                              ? `/dates`
                              : `/documents/${entry.entityId}`
                          }
                        >
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <DatesCalendar dates={filteredDates} />
      )}
    </div>
  );
}

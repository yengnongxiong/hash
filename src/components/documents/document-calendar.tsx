"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
  isPast,
  subYears,
  isAfter,
} from "date-fns";
import { ChevronLeft, ChevronRight, FileText, AlertCircle, Calendar as CalendarIcon, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DocumentDate {
  id: string;
  documentId: string;
  documentName: string;
  documentNumber: string | null;
  date: Date;
  type: string;
  context?: string;
}

interface DocumentCalendarProps {
  dates: DocumentDate[];
}

type DateRangeFilter = "all" | "1year" | "2years" | "future";

const DATE_TYPE_COLORS: Record<string, string> = {
  due_date: "bg-red-500",
  expiration: "bg-orange-500",
  invoice_date: "bg-blue-500",
  effective: "bg-green-500",
  transaction: "bg-purple-500",
  other: "bg-gray-500",
};

export function DocumentCalendar({ dates }: DocumentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>("2years");

  // Filter dates based on selected range
  const filteredDates = useMemo(() => {
    const now = new Date();
    switch (dateRangeFilter) {
      case "1year":
        return dates.filter((d) => isAfter(d.date, subYears(now, 1)));
      case "2years":
        return dates.filter((d) => isAfter(d.date, subYears(now, 2)));
      case "future":
        return dates.filter((d) => !isPast(d.date) || isToday(d.date));
      case "all":
      default:
        return dates;
    }
  }, [dates, dateRangeFilter]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of week for the first day (0 = Sunday)
  const startDayOfWeek = monthStart.getDay();

  // Create padding days for the start of the month
  const paddingDays = Array.from({ length: startDayOfWeek }, (_, i) => i);

  // Group dates by day (using filtered dates)
  const datesByDay = useMemo(() => {
    const map = new Map<string, DocumentDate[]>();
    for (const d of filteredDates) {
      const key = format(d.date, "yyyy-MM-dd");
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(d);
    }
    return map;
  }, [filteredDates]);

  // Get upcoming dates (next 30 days) - from filtered dates
  const upcomingDates = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = addMonths(now, 1);
    return filteredDates.filter(
      (d) => d.date >= now && d.date <= thirtyDaysFromNow
    );
  }, [filteredDates]);

  // Get overdue dates - from filtered dates
  const overdueDates = useMemo(() => {
    const now = new Date();
    return filteredDates.filter(
      (d) =>
        isPast(d.date) &&
        !isToday(d.date) &&
        (d.type === "due_date" || d.type === "expiration")
    );
  }, [filteredDates]);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Calendar */}
      <div className="lg:col-span-3 border rounded-lg p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-2">
            <Select value={dateRangeFilter} onValueChange={(value) => setDateRangeFilter(value as DateRangeFilter)}>
              <SelectTrigger className="w-[140px] h-8">
                <Filter className="h-3.5 w-3.5 mr-2" />
                <SelectValue placeholder="Filter dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="future">Future only</SelectItem>
                <SelectItem value="1year">Last 1 year</SelectItem>
                <SelectItem value="2years">Last 2 years</SelectItem>
                <SelectItem value="all">All dates</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Padding for start of month */}
          {paddingDays.map((_, i) => (
            <div key={`padding-${i}`} className="aspect-square" />
          ))}

          {/* Days */}
          {days.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayDates = datesByDay.get(dayKey) || [];
            const hasEvents = dayDates.length > 0;
            const hasOverdue = dayDates.some(
              (d) =>
                isPast(d.date) &&
                !isToday(d.date) &&
                (d.type === "due_date" || d.type === "expiration")
            );

            return (
              <Popover key={dayKey}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "aspect-square p-1 text-sm rounded-lg border transition-colors relative",
                      !isSameMonth(day, currentMonth) && "text-muted-foreground",
                      isToday(day) && "border-primary bg-primary/10",
                      hasEvents && "cursor-pointer hover:bg-muted",
                      hasOverdue && "border-red-500 bg-red-500/10"
                    )}
                    disabled={!hasEvents}
                  >
                    <span className={cn(isToday(day) && "font-bold text-primary")}>
                      {format(day, "d")}
                    </span>
                    {hasEvents && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {dayDates.slice(0, 3).map((d, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              DATE_TYPE_COLORS[d.type] || DATE_TYPE_COLORS.other
                            )}
                          />
                        ))}
                        {dayDates.length > 3 && (
                          <span className="text-[8px] text-muted-foreground">
                            +{dayDates.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                </PopoverTrigger>
                {hasEvents && (
                  <PopoverContent className="w-72 p-2" align="start">
                    <div className="space-y-2">
                      <p className="font-medium text-sm">
                        {format(day, "EEEE, MMMM d, yyyy")}
                      </p>
                      <div className="space-y-1">
                        {dayDates.map((d) => (
                          <Link
                            key={d.id}
                            href={`/documents/${d.documentId}`}
                            className="flex items-start gap-2 p-2 rounded hover:bg-muted transition-colors"
                          >
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                DATE_TYPE_COLORS[d.type] || DATE_TYPE_COLORS.other
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {d.documentName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {d.context || d.type}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                )}
              </Popover>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">Due Date</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-xs text-muted-foreground">Expiration</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-muted-foreground">Invoice Date</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">Effective</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-xs text-muted-foreground">Transaction</span>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Overdue */}
        {overdueDates.length > 0 && (
          <div className="border border-red-500/30 rounded-lg p-4 bg-red-500/5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <h3 className="font-medium text-red-500">Overdue</h3>
            </div>
            <div className="space-y-2">
              {overdueDates.slice(0, 5).map((d) => (
                <Link
                  key={d.id}
                  href={`/documents/${d.documentId}`}
                  className="flex items-start gap-2 p-2 rounded hover:bg-red-500/10 transition-colors"
                >
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{d.documentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(d.date, "MMM d, yyyy")} - {d.context}
                    </p>
                  </div>
                </Link>
              ))}
              {overdueDates.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{overdueDates.length - 5} more overdue
                </p>
              )}
            </div>
          </div>
        )}

        {/* Upcoming */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Upcoming (30 days)</h3>
          </div>
          {upcomingDates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming dates</p>
          ) : (
            <div className="space-y-2">
              {upcomingDates.slice(0, 10).map((d) => (
                <Link
                  key={d.id}
                  href={`/documents/${d.documentId}`}
                  className="flex items-start gap-2 p-2 rounded hover:bg-muted transition-colors"
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full mt-1.5 shrink-0",
                      DATE_TYPE_COLORS[d.type] || DATE_TYPE_COLORS.other
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{d.documentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(d.date, "MMM d, yyyy")} - {d.context}
                    </p>
                  </div>
                </Link>
              ))}
              {upcomingDates.length > 10 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{upcomingDates.length - 10} more upcoming
                </p>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-3">Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Showing</span>
              <span className="font-medium">{filteredDates.length} of {dates.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Upcoming</span>
              <span className="font-medium">{upcomingDates.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-red-500">Overdue</span>
              <span className="font-medium text-red-500">{overdueDates.length}</span>
            </div>
          </div>
          {dateRangeFilter !== "all" && filteredDates.length < dates.length && (
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
              {dates.length - filteredDates.length} date{dates.length - filteredDates.length !== 1 ? "s" : ""} hidden by filter
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

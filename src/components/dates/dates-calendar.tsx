"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isPast,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateEntry {
  id: string;
  title: string;
  date: Date;
  endDate?: Date;
  color?: string;
  entityName?: string;
  location?: string;
  status?: "scheduled" | "completed" | "cancelled";
}

interface DatesCalendarProps {
  dates: DateEntry[];
  onDateClick?: (entry: DateEntry) => void;
  onEmptyDayClick?: (date: Date) => void;
}

export function DatesCalendar({ dates, onDateClick, onEmptyDayClick }: DatesCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array.from({ length: startDayOfWeek }, (_, i) => i);

  // Group dates by day
  const datesByDay = useMemo(() => {
    const map = new Map<string, DateEntry[]>();
    for (const d of dates) {
      const key = format(d.date, "yyyy-MM-dd");
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(d);
    }
    return map;
  }, [dates]);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // Check if current month has any events
  const monthHasEvents = useMemo(() => {
    return dates.some((d) => isSameMonth(d.date, currentMonth));
  }, [dates, currentMonth]);

  return (
    <div className="border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-2">
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
          // Only show as overdue if there are scheduled (not cancelled/completed) events in the past
          const hasOverdueEvents = hasEvents && isPast(day) && !isToday(day) &&
            dayDates.some((d) => d.status === "scheduled" || !d.status);

          return (
            <Popover key={dayKey}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "aspect-square p-1 text-sm rounded-lg border transition-colors relative",
                    !isSameMonth(day, currentMonth) && "text-muted-foreground",
                    isToday(day) && "border-primary bg-primary/10",
                    "cursor-pointer hover:bg-muted",
                    hasOverdueEvents && "border-red-500 bg-red-500/10"
                  )}
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
                            d.color || "border border-muted-foreground/50"
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
              <PopoverContent className="w-80 p-2" align="start">
                <div className="space-y-2">
                  <p className="font-medium text-sm">
                    {format(day, "EEEE, MMMM d, yyyy")}
                  </p>
                  {hasEvents ? (
                    <div className="space-y-1 max-h-[300px] overflow-y-auto">
                      {dayDates.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => onDateClick?.(d)}
                          className="w-full flex items-start gap-2 p-2 rounded hover:bg-muted transition-colors text-left"
                        >
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full mt-1.5 shrink-0",
                              d.color || "border border-muted-foreground/50"
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {d.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {d.entityName || "No person"}
                              {d.endDate && (
                                <> • {format(d.date, "h:mm a")} - {format(d.endDate, "h:mm a")}</>
                              )}
                              {!d.endDate && (
                                <> • {format(d.date, "h:mm a")}</>
                              )}
                            </p>
                            {d.location && (
                              <p className="text-xs text-muted-foreground truncate">
                                {d.location}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No dates scheduled</p>
                  )}
                  {onEmptyDayClick && (
                    <button
                      onClick={() => onEmptyDayClick(day)}
                      className="w-full mt-2 p-2 text-sm text-center rounded border border-dashed border-muted-foreground/30 hover:bg-muted hover:border-muted-foreground/50 transition-colors"
                    >
                      + Add new date
                    </button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>

      {/* Empty month message */}
      {!monthHasEvents && (
        <div className="mt-4 text-center py-4 border-t">
          <p className="text-sm text-muted-foreground">
            No dates scheduled in {format(currentMonth, "MMMM yyyy")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Click any day to add a new date
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo, useCallback } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isPast,
  addWeeks,
  subWeeks,
  setHours,
  setMinutes,
  parseISO,
  addDays,
  differenceInDays,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

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

interface DatesWeekViewProps {
  dates: DateEntry[];
  onDateClick?: (entry: DateEntry) => void;
  onEmptySlotClick?: (date: Date) => void;
  onDateMove?: (entryId: string, newDate: Date) => void;
}

// Time slots from 6 AM to 10 PM (16 hours)
const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => i + 6);

export function DatesWeekView({
  dates,
  onDateClick,
  onEmptySlotClick,
  onDateMove,
}: DatesWeekViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToThisWeek = () => setCurrentWeek(new Date());

  // Group dates by day and sort by time
  const datesByDay = useMemo(() => {
    const map = new Map<string, DateEntry[]>();
    for (const d of dates) {
      const key = format(d.date, "yyyy-MM-dd");
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(d);
    }
    // Sort each day's dates by time
    map.forEach((dayDates) => {
      dayDates.sort((a, b) => a.date.getTime() - b.date.getTime());
    });
    return map;
  }, [dates]);

  // Calculate position and height for a date entry
  const getEntryStyle = (entry: DateEntry) => {
    const hour = entry.date.getHours();
    const minutes = entry.date.getMinutes();
    const startSlot = hour - 6; // Offset by 6 AM start

    // Calculate top position (percentage within the grid)
    const top = (startSlot + minutes / 60) * 100 / TIME_SLOTS.length;

    // Calculate height based on duration (default 1 hour if no end time)
    let durationHours = 1;
    if (entry.endDate) {
      durationHours = (entry.endDate.getTime() - entry.date.getTime()) / (1000 * 60 * 60);
    }
    const height = Math.min(durationHours * 100 / TIME_SLOTS.length, 100 - top);

    return {
      top: `${Math.max(0, top)}%`,
      height: `${Math.max(height, 4)}%`, // Minimum 4% height for visibility
    };
  };

  // Handle drag end
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination || !onDateMove) return;

      const sourceDay = result.source.droppableId;
      const destDay = result.destination.droppableId;

      // If dropped on the same day, do nothing
      if (sourceDay === destDay) return;

      const entryId = result.draggableId;
      const entry = dates.find((d) => d.id === entryId);

      if (!entry) return;

      // Calculate the new date by preserving the time but changing the day
      const sourceDayDate = parseISO(sourceDay);
      const destDayDate = parseISO(destDay);
      const daysDiff = differenceInDays(destDayDate, sourceDayDate);
      const newDate = addDays(entry.date, daysDiff);

      onDateMove(entryId, newDate);
    },
    [dates, onDateMove]
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="border rounded-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToThisWeek}>
              This Week
            </Button>
            <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Drag hint */}
        {onDateMove && (
          <div className="px-4 py-2 bg-muted/50 text-xs text-muted-foreground border-b">
            Drag dates between days to reschedule
          </div>
        )}

        {/* Week grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Day headers */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
              <div className="p-2 text-sm text-muted-foreground"></div>
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "p-2 text-center border-l",
                    isToday(day) && "bg-primary/10"
                  )}
                >
                  <p className="text-xs text-muted-foreground">
                    {format(day, "EEE")}
                  </p>
                  <p
                    className={cn(
                      "text-lg font-medium",
                      isToday(day) && "text-primary"
                    )}
                  >
                    {format(day, "d")}
                  </p>
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)]">
              {/* Time labels */}
              <div className="relative">
                {TIME_SLOTS.map((hour) => (
                  <div
                    key={hour}
                    className="h-12 border-b text-xs text-muted-foreground pr-2 text-right -mt-2"
                  >
                    {format(setHours(new Date(), hour), "h a")}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {days.map((day) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const dayDates = datesByDay.get(dayKey) || [];
                const hasOverdueEvents =
                  isPast(day) &&
                  !isToday(day) &&
                  dayDates.some(
                    (d) => d.status === "scheduled" || !d.status
                  );

                return (
                  <Droppable key={dayKey} droppableId={dayKey}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "relative border-l",
                          hasOverdueEvents && "bg-red-500/5",
                          snapshot.isDraggingOver && "bg-primary/10"
                        )}
                      >
                        {/* Hour grid lines */}
                        {TIME_SLOTS.map((hour) => (
                          <div
                            key={hour}
                            className="h-12 border-b hover:bg-muted/50 cursor-pointer"
                            onClick={() => {
                              if (onEmptySlotClick) {
                                const slotDate = setMinutes(
                                  setHours(day, hour),
                                  0
                                );
                                onEmptySlotClick(slotDate);
                              }
                            }}
                          />
                        ))}

                        {/* Events */}
                        <div className="absolute inset-0 pointer-events-none">
                          {dayDates.map((entry, index) => {
                            const hour = entry.date.getHours();
                            // Only show events within our time range
                            if (hour < 6 || hour > 22) return null;

                            const style = getEntryStyle(entry);
                            const isCancelled = entry.status === "cancelled";
                            const isCompleted = entry.status === "completed";

                            return (
                              <Draggable
                                key={entry.id}
                                draggableId={entry.id}
                                index={index}
                                isDragDisabled={!onDateMove}
                              >
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    className={cn(
                                      "absolute left-1 right-1 rounded px-1 py-0.5 text-left overflow-hidden pointer-events-auto transition-shadow cursor-grab",
                                      isCancelled
                                        ? "bg-muted opacity-60 line-through"
                                        : isCompleted
                                        ? "bg-green-500/20 border border-green-500/30"
                                        : entry.color ||
                                          "bg-primary/20 border border-primary/30",
                                      dragSnapshot.isDragging &&
                                        "shadow-lg cursor-grabbing ring-2 ring-primary"
                                    )}
                                    style={{
                                      ...style,
                                      ...dragProvided.draggableProps.style,
                                      // Preserve top/height during drag
                                      ...(dragSnapshot.isDragging
                                        ? {}
                                        : { top: style.top, height: style.height }),
                                    }}
                                    onClick={(e) => {
                                      if (!dragSnapshot.isDragging) {
                                        e.stopPropagation();
                                        onDateClick?.(entry);
                                      }
                                    }}
                                  >
                                    <p className="text-xs font-medium truncate">
                                      {entry.title}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {format(entry.date, "h:mm a")}
                                      {entry.entityName &&
                                        ` • ${entry.entityName}`}
                                    </p>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_EVENTS = 3;
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

  // Calculate overlapping events layout for a day using proper time-based overlap detection
  const getOverlapLayout = useCallback((dayDates: DateEntry[]) => {
    const layout = new Map<string, { column: number; totalColumns: number; visible: boolean }>();
    const overflowGroups = new Map<number, DateEntry[]>(); // For "+X more" groups (keyed by representative hour)

    // Helper to get event end time (default 1 hour if not specified)
    const getEndTime = (entry: DateEntry) => {
      return entry.endDate || new Date(entry.date.getTime() + 60 * 60 * 1000);
    };

    // Check if two events overlap in time
    const eventsOverlap = (a: DateEntry, b: DateEntry) => {
      const aStart = a.date.getTime();
      const aEnd = getEndTime(a).getTime();
      const bStart = b.date.getTime();
      const bEnd = getEndTime(b).getTime();
      // Events overlap if one starts before the other ends
      return aStart < bEnd && bStart < aEnd;
    };

    // Find all events that overlap with a given event
    const findOverlappingEvents = (entry: DateEntry, allEntries: DateEntry[]) => {
      return allEntries.filter(other => other.id !== entry.id && eventsOverlap(entry, other));
    };

    // Build overlap clusters using union-find approach
    const clusters: DateEntry[][] = [];
    const assignedToCluster = new Set<string>();

    for (const entry of dayDates) {
      if (assignedToCluster.has(entry.id)) continue;

      // Start a new cluster with this entry
      const cluster: DateEntry[] = [entry];
      const toCheck = [entry];
      assignedToCluster.add(entry.id);

      // BFS to find all transitively overlapping events
      while (toCheck.length > 0) {
        const current = toCheck.pop()!;
        const overlapping = findOverlappingEvents(current, dayDates);

        for (const overlappingEntry of overlapping) {
          if (!assignedToCluster.has(overlappingEntry.id)) {
            cluster.push(overlappingEntry);
            assignedToCluster.add(overlappingEntry.id);
            toCheck.push(overlappingEntry);
          }
        }
      }

      // Sort cluster by start time
      cluster.sort((a, b) => a.date.getTime() - b.date.getTime());
      clusters.push(cluster);
    }

    // Assign columns within each cluster
    for (const cluster of clusters) {
      const hasOverflow = cluster.length > MAX_VISIBLE_EVENTS;
      const maxVisible = hasOverflow ? MAX_VISIBLE_EVENTS - 1 : MAX_VISIBLE_EVENTS;

      if (hasOverflow) {
        // Use the earliest event's hour as the key for overflow group
        const representativeHour = cluster[0].date.getHours();
        overflowGroups.set(representativeHour, cluster);
      }

      // Assign columns using a greedy algorithm
      // Track which columns are occupied at any given time
      const columnEndTimes: number[] = [];

      cluster.forEach((entry, index) => {
        const isVisible = index < maxVisible;
        const startTime = entry.date.getTime();

        // Find the first available column
        let column = -1;
        for (let i = 0; i < columnEndTimes.length; i++) {
          if (columnEndTimes[i] <= startTime) {
            column = i;
            break;
          }
        }

        // If no column is free, add a new one
        if (column === -1) {
          column = columnEndTimes.length;
          columnEndTimes.push(0);
        }

        // Update column end time
        columnEndTimes[column] = getEndTime(entry).getTime();

        layout.set(entry.id, {
          column: Math.min(column, MAX_VISIBLE_EVENTS - 1), // Cap column to max
          totalColumns: MAX_VISIBLE_EVENTS,
          visible: isVisible
        });
      });
    }

    return { layout, overflowGroups };
  }, []);

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
                    className="h-12 border-b flex items-start justify-end"
                  >
                    <span className="text-xs text-muted-foreground pr-2 -translate-y-2">
                      {format(setHours(new Date(), hour), "h a")}
                    </span>
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
                          {(() => {
                            const { layout: overlapLayout, overflowGroups } = getOverlapLayout(dayDates);
                            const renderedOverflowHours = new Set<number>();

                            return (
                              <>
                                {dayDates.map((entry, index) => {
                                  const hour = entry.date.getHours();
                                  // Only show events within our time range
                                  if (hour < 6 || hour > 22) return null;

                                  const layoutInfo = overlapLayout.get(entry.id) || { column: 0, totalColumns: 1, visible: true };

                                  // Skip hidden events (they'll be in the popover)
                                  if (!layoutInfo.visible) return null;

                                  const style = getEntryStyle(entry);
                                  const isCancelled = entry.status === "cancelled";
                                  const isCompleted = entry.status === "completed";

                                  // Get overlap layout for positioning
                                  const widthPercent = 100 / layoutInfo.totalColumns;
                                  const leftPercent = layoutInfo.column * widthPercent;

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
                                            "absolute rounded px-1 py-0.5 text-left overflow-hidden pointer-events-auto transition-shadow cursor-grab",
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
                                            ...dragProvided.draggableProps.style,
                                            // Position and size
                                            ...(dragSnapshot.isDragging
                                              ? {}
                                              : {
                                                  top: style.top,
                                                  height: style.height,
                                                  left: `calc(${leftPercent}% + 2px)`,
                                                  width: `calc(${widthPercent}% - 4px)`,
                                                }),
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

                                {/* "+X more" buttons for overflow groups - styled like date entries */}
                                {Array.from(overflowGroups.entries()).map(([representativeHour, group]) => {
                                  if (renderedOverflowHours.has(representativeHour)) return null;
                                  renderedOverflowHours.add(representativeHour);

                                  // Filter group to only include events within visible time range
                                  const visibleGroup = group.filter(e => {
                                    const h = e.date.getHours();
                                    return h >= 6 && h <= 22;
                                  });

                                  // Skip if no visible events or not enough to overflow
                                  if (visibleGroup.length <= MAX_VISIBLE_EVENTS) return null;

                                  // We show MAX_VISIBLE_EVENTS - 1 events, rest go in the popover
                                  const visibleCount = MAX_VISIBLE_EVENTS - 1;
                                  const hiddenCount = visibleGroup.length - visibleCount;
                                  const hiddenEntries = visibleGroup.slice(visibleCount); // Only the hidden ones

                                  // Use the first visible event's actual time for positioning
                                  const firstEvent = visibleGroup[0];
                                  const firstEventHour = firstEvent.date.getHours();
                                  const firstEventMinutes = firstEvent.date.getMinutes();
                                  const startSlot = firstEventHour - 6;
                                  const top = ((startSlot + firstEventMinutes / 60) * 100) / TIME_SLOTS.length;

                                  // Position at the last column (after visible events)
                                  const columnWidth = 100 / MAX_VISIBLE_EVENTS;
                                  const leftPercent = visibleCount * columnWidth;

                                  return (
                                    <Popover key={`overflow-${representativeHour}`}>
                                      <PopoverTrigger asChild>
                                        <button
                                          className="absolute rounded px-1 py-0.5 text-left overflow-hidden pointer-events-auto bg-muted/80 border border-border hover:bg-muted transition-colors"
                                          style={{
                                            top: `${Math.max(0, top)}%`,
                                            height: `${Math.max(100 / TIME_SLOTS.length, 4)}%`,
                                            left: `calc(${leftPercent}% + 2px)`,
                                            width: `calc(${columnWidth}% - 4px)`,
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <p className="text-xs font-medium text-muted-foreground">
                                            +{hiddenCount} more
                                          </p>
                                          <p className="text-[10px] text-muted-foreground/70">
                                            {format(firstEvent.date, "h:mm a")}
                                          </p>
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-72 p-3" align="end">
                                        <p className="text-sm font-medium mb-3">
                                          {hiddenCount} more events
                                        </p>
                                        <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                                          {hiddenEntries.map((entry) => (
                                            <button
                                              key={entry.id}
                                              className={cn(
                                                "w-full text-left p-2.5 rounded-md text-sm hover:bg-muted transition-colors border",
                                                entry.status === "cancelled" && "opacity-60 line-through"
                                              )}
                                              onClick={() => onDateClick?.(entry)}
                                            >
                                              <p className="font-medium truncate">{entry.title}</p>
                                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                {format(entry.date, "h:mm a")}
                                                {entry.entityName && ` • ${entry.entityName}`}
                                              </p>
                                            </button>
                                          ))}
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  );
                                })}
                              </>
                            );
                          })()}
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

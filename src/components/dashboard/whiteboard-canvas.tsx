"use client";

import { WhiteboardTask } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

interface WhiteboardCanvasProps {
  tasks: WhiteboardTask[];
  onDeleteTask: (taskId: string) => void;
  onDragEnd: (result: DropResult) => void;
  onTaskClick?: (task: WhiteboardTask) => void;
  organizationId: string;
  isPending?: boolean;
  mousePos?: { x: number; y: number };
}

const STATUS_CONFIG = {
  todo: {
    label: "To Do",
    headerBg: "bg-yellow-400 dark:bg-yellow-600",
    sectionBg: "bg-yellow-50/80 dark:bg-yellow-950/30",
    noteBg: "bg-yellow-100 dark:bg-yellow-900/40",
    borderColor: "border-yellow-300 dark:border-yellow-700",
    dropHighlight: "bg-yellow-200/50 dark:bg-yellow-800/30",
  },
  in_progress: {
    label: "In Progress",
    headerBg: "bg-blue-400 dark:bg-blue-600",
    sectionBg: "bg-blue-50/80 dark:bg-blue-950/30",
    noteBg: "bg-blue-100 dark:bg-blue-900/40",
    borderColor: "border-blue-300 dark:border-blue-700",
    dropHighlight: "bg-blue-200/50 dark:bg-blue-800/30",
  },
  done: {
    label: "Done",
    headerBg: "bg-green-400 dark:bg-green-600",
    sectionBg: "bg-green-50/80 dark:bg-green-950/30",
    noteBg: "bg-green-100 dark:bg-green-900/40",
    borderColor: "border-green-300 dark:border-green-700",
    dropHighlight: "bg-green-200/50 dark:bg-green-800/30",
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

const PRIORITY_COLORS = {
  low: "bg-slate-400",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

interface StickyNoteProps {
  task: WhiteboardTask;
  index: number;
  onDelete: () => void;
  onClick?: () => void;
}

function StickyNote({
  task,
  index,
  onDelete,
  onClick,
}: StickyNoteProps) {
  const status = task.status as StatusKey;
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.todo;
  const priority = (task.priority || "medium") as keyof typeof PRIORITY_COLORS;

  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && task.status !== "done";
  const isDueToday = dueDate && isToday(dueDate);

  // Alternate rotation for visual variety based on index
  const rotations = ["-rotate-1", "rotate-1", "-rotate-0.5", "rotate-0.5", "rotate-0"];
  const rotation = rotations[index % rotations.length];

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "w-40 min-h-[140px] p-3 shadow-md cursor-grab active:cursor-grabbing group relative",
            config.noteBg,
            config.borderColor,
            "border-2 rounded-sm",
            snapshot.isDragging
              ? "shadow-2xl scale-105 rotate-0 z-50 ring-2 ring-primary/50"
              : rotation,
            !snapshot.isDragging && "hover:scale-105 hover:shadow-lg hover:z-10 transition-all duration-150"
          )}
          style={{
            ...provided.draggableProps.style,
            backgroundColor: task.color && task.color !== "#3b82f6" ? task.color : undefined,
          }}
        >
          {/* Priority indicator */}
          <div
            className={cn(
              "absolute top-0 left-0 w-1.5 h-full rounded-l-sm",
              PRIORITY_COLORS[priority]
            )}
          />

          {/* Pin effect */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-500 shadow-md border-2 border-red-600" />

          {/* Delete button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-0.5 right-0.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDelete();
            }}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>

          {/* Click area for opening dialog */}
          <div
            className="h-full flex flex-col pl-2 pr-4"
            onClick={(e) => {
              if (!snapshot.isDragging) {
                e.stopPropagation();
                onClick?.();
              }
            }}
          >
            <p className="text-xs font-medium line-clamp-4 flex-1">{task.title}</p>
            {task.description && (
              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Footer with due date */}
            <div className="flex items-center gap-1 mt-auto pt-2">
              {dueDate && (
                <div
                  className={cn(
                    "flex items-center gap-0.5 text-[9px]",
                    isOverdue && "text-red-600 font-medium",
                    isDueToday && "text-orange-600 font-medium",
                    !isOverdue && !isDueToday && "text-muted-foreground"
                  )}
                >
                  {isOverdue && <AlertCircle className="h-2.5 w-2.5" />}
                  <Calendar className="h-2.5 w-2.5" />
                  <span>{format(dueDate, "M/d")}</span>
                </div>
              )}
              <p className="text-[9px] text-muted-foreground ml-auto">
                {formatDistanceToNow(new Date(task.created_at))}
              </p>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

export function WhiteboardCanvas({
  tasks,
  onDeleteTask,
  onDragEnd,
  onTaskClick,
  isPending,
  mousePos = { x: 0, y: 0 },
}: WhiteboardCanvasProps) {
  const getTasksByStatus = (status: StatusKey) =>
    tasks
      .filter((t) => t.status === status)
      .sort((a, b) => ((a as any).position || 0) - ((b as any).position || 0));

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div
        className={cn(
          "rounded-lg overflow-hidden transition-opacity",
          "bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100",
          "dark:from-amber-950/30 dark:via-stone-900 dark:to-orange-950/30",
          "border-4 border-amber-800/20 dark:border-amber-900/50",
          "shadow-inner",
          isPending && "opacity-70"
        )}
        style={{
          backgroundImage: `
            radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(251, 191, 36, 0.12), transparent 40%),
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0z' fill='none'/%3E%3Cpath d='M0 30h60M30 0v60' stroke='%23d4a373' stroke-width='0.3' stroke-opacity='0.12'/%3E%3C/svg%3E")
          `,
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 min-h-[500px]">
          {(Object.keys(STATUS_CONFIG) as StatusKey[]).map((status) => {
            const config = STATUS_CONFIG[status];
            const statusTasks = getTasksByStatus(status);

            return (
              <div
                key={status}
                className={cn(
                  "flex flex-col border-r border-amber-800/10 dark:border-amber-700/20 last:border-r-0",
                  config.sectionBg
                )}
              >
                {/* Section header */}
                <div className={cn(
                  "p-3 flex items-center justify-between",
                  config.headerBg,
                  "shadow-sm"
                )}>
                  <Badge
                    variant="secondary"
                    className="text-xs font-bold px-3 py-1 bg-white/90 dark:bg-black/50 text-foreground border-0 shadow-sm"
                  >
                    {config.label}
                  </Badge>
                  <span className="text-sm font-bold text-white dark:text-white/90 bg-black/20 dark:bg-white/20 px-2 py-0.5 rounded-full">
                    {statusTasks.length}
                  </span>
                </div>

                {/* Scrollable drop zone */}
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "flex-1 p-4 overflow-y-auto min-h-[400px] max-h-[calc(100vh-300px)]",
                        snapshot.isDraggingOver && [
                          config.dropHighlight,
                          "ring-2 ring-inset ring-primary/30"
                        ]
                      )}
                    >
                      {/* Grid layout for sticky notes - max 2 columns */}
                      <div className="grid grid-cols-2 gap-3 content-start auto-rows-min">
                        {statusTasks.map((task, index) => (
                          <StickyNote
                            key={task.id}
                            task={task}
                            index={index}
                            onDelete={() => onDeleteTask(task.id)}
                            onClick={() => onTaskClick?.(task)}
                          />
                        ))}
                        {provided.placeholder}
                      </div>

                      {/* Empty state */}
                      {statusTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="h-full flex items-center justify-center min-h-[200px]">
                          <p className="text-sm text-muted-foreground/60 italic">
                            Drag tasks here
                          </p>
                        </div>
                      )}

                      {/* Drop indicator */}
                      {snapshot.isDraggingOver && statusTasks.length === 0 && (
                        <div className="h-full flex items-center justify-center min-h-[200px]">
                          <div className="border-2 border-dashed border-primary/50 rounded-lg p-6">
                            <p className="text-sm font-medium text-primary">
                              Drop here
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}

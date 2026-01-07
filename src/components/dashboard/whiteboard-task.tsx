"use client";

import { WhiteboardTask } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Trash2,
  Calendar,
  Paperclip,
  CheckSquare,
  AlertCircle,
} from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";
import { formatDistanceToNow } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";

interface WhiteboardTaskCardProps {
  task: WhiteboardTask;
  index: number;
  onDelete: () => void;
  onClick?: () => void;
  attachmentCount?: number;
  subtaskProgress?: { completed: number; total: number };
  assigneeName?: string;
}

const PRIORITY_CONFIG = {
  low: {
    border: "border-l-slate-400",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    label: "Low",
  },
  medium: {
    border: "border-l-blue-500",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    label: "Medium",
  },
  high: {
    border: "border-l-orange-500",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    label: "High",
  },
  urgent: {
    border: "border-l-red-500",
    badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    label: "Urgent",
  },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Determine if text should be dark based on background color luminance
function shouldUseDarkText(hexColor: string): boolean {
  // Default to light text for dark backgrounds
  if (!hexColor || hexColor === "#ffffff") return true;

  // Convert hex to RGB
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Use dark text for light backgrounds (luminance > 0.5)
  return luminance > 0.5;
}

export function WhiteboardTaskCard({
  task,
  index,
  onDelete,
  onClick,
  attachmentCount = 0,
  subtaskProgress,
  assigneeName,
}: WhiteboardTaskCardProps) {
  const priority = (task.priority || "medium") as keyof typeof PRIORITY_CONFIG;
  const priorityConfig = PRIORITY_CONFIG[priority];

  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && task.status !== "done";
  const isDueToday = dueDate && isToday(dueDate);

  const labels = task.labels || [];
  const useDarkText = shouldUseDarkText(task.color || "#ffffff");

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            "cursor-pointer hover:shadow-md transition-all group border-l-4",
            priorityConfig.border,
            snapshot.isDragging && "shadow-lg ring-2 ring-primary rotate-2"
          )}
          style={{
            ...provided.draggableProps.style,
            backgroundColor: task.color !== "#ffffff" ? task.color : undefined,
          }}
        >
          <CardContent className="p-3">
            <div className="space-y-2">
              {/* Header with title and delete */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium leading-tight line-clamp-2",
                    task.color && task.color !== "#ffffff" && (useDarkText ? "text-gray-900" : "text-white")
                  )}>{task.title}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>

              {/* Description */}
              {task.description && (
                <p className={cn(
                  "text-xs line-clamp-2",
                  task.color && task.color !== "#ffffff"
                    ? (useDarkText ? "text-gray-700" : "text-white/80")
                    : "text-muted-foreground"
                )}>
                  {task.description}
                </p>
              )}

              {/* Labels */}
              {labels.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {labels.slice(0, 2).map((label, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {label}
                    </Badge>
                  ))}
                  {labels.length > 2 && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      +{labels.length - 2}
                    </Badge>
                  )}
                </div>
              )}

              {/* Footer with metadata */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  {/* Due date */}
                  {dueDate && (
                    <div
                      className={cn(
                        "flex items-center gap-1 text-[10px]",
                        isOverdue && "text-red-500",
                        isDueToday && "text-orange-500",
                        !isOverdue && !isDueToday && "text-muted-foreground"
                      )}
                    >
                      {isOverdue && <AlertCircle className="h-3 w-3" />}
                      <Calendar className="h-3 w-3" />
                      <span>{format(dueDate, "MMM d")}</span>
                    </div>
                  )}

                  {/* Attachments count */}
                  {attachmentCount > 0 && (
                    <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Paperclip className="h-3 w-3" />
                      <span>{attachmentCount}</span>
                    </div>
                  )}

                  {/* Subtasks progress */}
                  {subtaskProgress && subtaskProgress.total > 0 && (
                    <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <CheckSquare className="h-3 w-3" />
                      <span>
                        {subtaskProgress.completed}/{subtaskProgress.total}
                      </span>
                    </div>
                  )}
                </div>

                {/* Assignee avatar */}
                {assigneeName && (
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px] bg-primary/10">
                      {getInitials(assigneeName)}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>

              {/* Priority badge for high/urgent only */}
              {(priority === "high" || priority === "urgent") && (
                <Badge className={cn("text-[10px] px-1.5 py-0", priorityConfig.badge)}>
                  {priorityConfig.label}
                </Badge>
              )}

              {/* Timestamp */}
              <p className={cn(
                "text-[10px]",
                task.color && task.color !== "#ffffff"
                  ? (useDarkText ? "text-gray-600" : "text-white/70")
                  : "text-muted-foreground"
              )}>
                {formatDistanceToNow(new Date(task.created_at))}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}

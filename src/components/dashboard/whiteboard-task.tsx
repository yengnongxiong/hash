"use client";

import { useState } from "react";
import { WhiteboardTask, User } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Trash2,
  Calendar,
  Paperclip,
  CheckSquare,
  AlertCircle,
  EyeOff,
  GripVertical,
} from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";
import { formatDistanceToNow } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";

interface WhiteboardTaskCardProps {
  task: WhiteboardTask;
  index: number;
  onDelete: () => void;
  onHide?: () => void;
  onClick?: () => void;
  attachmentCount?: number;
  subtaskProgress?: { completed: number; total: number };
  teamMembers?: Pick<User, "id" | "name" | "email">[];
}

const PRIORITY_CONFIG = {
  low: {
    border: "border-l-slate-400 dark:border-l-slate-500",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    label: "Low",
    glow: "rgba(148, 163, 184, 0.2)",
  },
  medium: {
    border: "border-l-blue-500 dark:border-l-blue-400",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    label: "Medium",
    glow: "rgba(59, 130, 246, 0.2)",
  },
  high: {
    border: "border-l-orange-500 dark:border-l-orange-400",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    label: "High",
    glow: "rgba(249, 115, 22, 0.2)",
  },
  urgent: {
    border: "border-l-red-500 dark:border-l-red-400",
    badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    label: "Urgent",
    glow: "rgba(239, 68, 68, 0.3)",
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
  if (!hexColor || hexColor === "#ffffff" || hexColor === "#3b82f6") return false;

  const hex = hexColor.replace("#", "");
  if (hex.length !== 6) return false;

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

// Get a subtle background color based on the card color
function getCardBackground(color: string | undefined, isDragging: boolean): string {
  if (!color || color === "#ffffff") {
    return isDragging ? "hsl(var(--card))" : "hsl(var(--card))";
  }
  return color;
}

export function WhiteboardTaskCard({
  task,
  index,
  onDelete,
  onHide,
  onClick,
  attachmentCount = 0,
  subtaskProgress,
  teamMembers = [],
}: WhiteboardTaskCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const priority = (task.priority || "medium") as keyof typeof PRIORITY_CONFIG;
  const priorityConfig = PRIORITY_CONFIG[priority];

  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && task.status !== "done";
  const isDueToday = dueDate && isToday(dueDate);

  const labels = task.labels || [];
  const hasColor = task.color && task.color !== "#ffffff" && task.color !== "#3b82f6";
  const useDarkText = hasColor && shouldUseDarkText(task.color!);

  // Get assignees from team members
  const assigneeIds = task.assigned_to_ids || [];
  const assignees = teamMembers.filter((m) => assigneeIds.includes(m.id));
  // Fallback to legacy assigned_to
  if (assignees.length === 0 && task.assigned_to) {
    const legacyAssignee = teamMembers.find((m) => m.id === task.assigned_to);
    if (legacyAssignee) assignees.push(legacyAssignee);
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    onDelete();
    setDeleteDialogOpen(false);
  };

  const handleHideClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onHide?.();
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="mb-2 last:mb-0"
        >
          <Card
            onClick={onClick}
            className={cn(
              "cursor-pointer transition-all duration-200 group border-l-4 overflow-hidden",
              priorityConfig.border,
              snapshot.isDragging
                ? "shadow-2xl ring-2 ring-primary/50 scale-[1.02] z-50"
                : "hover:shadow-lg hover:scale-[1.01] hover:-translate-y-0.5",
              !snapshot.isDragging && "active:scale-[0.98]"
            )}
            style={{
              ...provided.draggableProps.style,
              backgroundColor: getCardBackground(task.color, snapshot.isDragging),
              boxShadow: snapshot.isDragging
                ? `0 25px 50px -12px ${priorityConfig.glow}, 0 0 0 2px hsl(var(--primary) / 0.3)`
                : undefined,
            }}
          >
            <CardContent className="p-3">
              <div className="space-y-2">
                {/* Drag handle and actions row */}
                <div className="flex items-start gap-1">
                  {/* Drag handle */}
                  <div
                    {...provided.dragHandleProps}
                    className={cn(
                      "shrink-0 p-0.5 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 transition-opacity",
                      snapshot.isDragging && "opacity-100"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GripVertical className={cn(
                      "h-4 w-4",
                      hasColor && useDarkText ? "text-gray-600" : hasColor ? "text-white/70" : "text-muted-foreground"
                    )} />
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className={cn(
                      "text-sm font-medium leading-tight line-clamp-2",
                      hasColor && useDarkText && "text-gray-900",
                      hasColor && !useDarkText && "text-white"
                    )} style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                      {task.title}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className={cn(
                    "flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                    snapshot.isDragging && "opacity-0"
                  )}>
                    <TooltipProvider delayDuration={300}>
                      {onHide && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 hover:bg-muted/50"
                              onClick={handleHideClick}
                            >
                              <EyeOff className={cn(
                                "h-3 w-3",
                                hasColor && useDarkText ? "text-gray-600" : hasColor ? "text-white/70" : "text-muted-foreground"
                              )} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Hide from Kanban</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-destructive/10"
                            onClick={handleDeleteClick}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Delete task</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Description */}
                {task.description && (
                  <p className={cn(
                    "text-xs line-clamp-2 pl-5",
                    hasColor && useDarkText ? "text-gray-700" : hasColor ? "text-white/80" : "text-muted-foreground"
                  )} style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                    {task.description}
                  </p>
                )}

                {/* Labels */}
                {labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-5">
                    {labels.slice(0, 2).map((label, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5 py-0 max-w-[80px]",
                          hasColor && "bg-white/20 text-inherit border-white/30"
                        )}
                      >
                        <span className="truncate">{label}</span>
                      </Badge>
                    ))}
                    {labels.length > 2 && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          hasColor && "bg-white/20 text-inherit border-white/30"
                        )}
                      >
                        +{labels.length - 2}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Footer with metadata */}
                <div className="flex items-center justify-between pt-1 pl-5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Due date */}
                    {dueDate && (
                      <div
                        className={cn(
                          "flex items-center gap-1 text-[10px] font-medium",
                          isOverdue && "text-red-500",
                          isDueToday && "text-orange-500",
                          !isOverdue && !isDueToday && (
                            hasColor && useDarkText ? "text-gray-600" : hasColor ? "text-white/80" : "text-muted-foreground"
                          )
                        )}
                      >
                        {isOverdue && <AlertCircle className="h-3 w-3" />}
                        <Calendar className="h-3 w-3" />
                        <span>{format(dueDate, "MMM d")}</span>
                      </div>
                    )}

                    {/* Attachments count */}
                    {attachmentCount > 0 && (
                      <div className={cn(
                        "flex items-center gap-0.5 text-[10px]",
                        hasColor && useDarkText ? "text-gray-600" : hasColor ? "text-white/70" : "text-muted-foreground"
                      )}>
                        <Paperclip className="h-3 w-3" />
                        <span>{attachmentCount}</span>
                      </div>
                    )}

                    {/* Subtasks progress */}
                    {subtaskProgress && subtaskProgress.total > 0 && (
                      <div className={cn(
                        "flex items-center gap-0.5 text-[10px]",
                        hasColor && useDarkText ? "text-gray-600" : hasColor ? "text-white/70" : "text-muted-foreground"
                      )}>
                        <CheckSquare className="h-3 w-3" />
                        <span>
                          {subtaskProgress.completed}/{subtaskProgress.total}
                        </span>
                      </div>
                    )}

                    {/* Priority badge for high/urgent only */}
                    {(priority === "high" || priority === "urgent") && (
                      <Badge className={cn("text-[10px] px-1.5 py-0", priorityConfig.badge)}>
                        {priorityConfig.label}
                      </Badge>
                    )}
                  </div>

                  {/* Assignees */}
                  {assignees.length > 0 && (
                    <div className="flex items-center -space-x-1.5">
                      {assignees.slice(0, 3).map((assignee) => (
                        <TooltipProvider key={assignee.id} delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Avatar className="h-5 w-5 border-2 border-background">
                                <AvatarFallback className="text-[8px] bg-primary/10">
                                  {getInitials(assignee.name || assignee.email)}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {assignee.name || assignee.email}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                      {assignees.length > 3 && (
                        <div className={cn(
                          "h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-medium border-2 border-background",
                          hasColor ? "bg-white/30" : "bg-muted"
                        )}>
                          +{assignees.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <p className={cn(
                  "text-[10px] pl-5",
                  hasColor && useDarkText ? "text-gray-500" : hasColor ? "text-white/60" : "text-muted-foreground"
                )}>
                  {formatDistanceToNow(new Date(task.created_at))}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Task</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{task.title.length > 50 ? task.title.slice(0, 50) + "..." : task.title}&quot;? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </Draggable>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WhiteboardTask, User } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Pencil,
  Trash2,
  Calendar,
  User as UserIcon,
  Flag,
  Palette,
  Tag,
  Search,
  X,
  ChevronDown,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { updateWhiteboardTask, deleteWhiteboardTask } from "@/app/(dashboard)/tasks/actions";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { TaskSubtasks } from "./task-subtasks";
import { TaskAttachments } from "./task-attachments";
import { SketchCanvasDialog } from "./sketch-canvas-dialog";

interface TaskDetailDialogProps {
  task: WhiteboardTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdate: (task: WhiteboardTask) => void;
  onTaskDelete: (taskId: string) => void;
  teamMembers?: Pick<User, "id" | "name" | "email">[];
}

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do", textClass: "text-yellow-600 dark:text-yellow-400" },
  { value: "in_progress", label: "In Progress", textClass: "text-blue-600 dark:text-blue-400" },
  { value: "done", label: "Done", textClass: "text-green-600 dark:text-green-400" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "bg-slate-400" },
  { value: "medium", label: "Medium", color: "bg-blue-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "urgent", label: "Urgent", color: "bg-red-500" },
];

const COLOR_OPTIONS = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#22c55e", label: "Green" },
  { value: "#a855f7", label: "Purple" },
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#ec4899", label: "Pink" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#64748b", label: "Slate" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onTaskUpdate,
  onTaskDelete,
  teamMembers = [],
}: TaskDetailDialogProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [peoplePopoverOpen, setPeoplePopoverOpen] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [sketchDialogOpen, setSketchDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Edit state
  const [editedTask, setEditedTask] = useState<Partial<WhiteboardTask>>({});

  // Get current values (edited or original)
  const currentTask = task
    ? { ...task, ...editedTask }
    : null;

  // Reset edit state when dialog opens/closes or task changes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setIsEditing(false);
      setEditedTask({});
    }
    onOpenChange(newOpen);
  };

  const handleStartEdit = () => {
    if (!task) return;
    setEditedTask({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
      color: task.color,
      assigned_to_ids: task.assigned_to_ids || [],
      labels: task.labels,
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedTask({});
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!task || !currentTask) return;

    startTransition(async () => {
      const result = await updateWhiteboardTask(task.id, {
        title: currentTask.title,
        description: currentTask.description,
        status: (currentTask.status || "todo") as "todo" | "in_progress" | "done",
        priority: (currentTask.priority || "medium") as "low" | "medium" | "high",
        due_date: currentTask.due_date ?? undefined,
        color: currentTask.color ?? undefined,
        assigned_to_ids: currentTask.assigned_to_ids || [],
        labels: currentTask.labels ?? undefined,
      });

      if (result.error) {
        toast.error("Failed to update task", { description: result.error });
      } else {
        toast.success("Task updated");
        onTaskUpdate(currentTask as WhiteboardTask);
        setIsEditing(false);
        setEditedTask({});
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    if (!task) return;
    onTaskDelete(task.id);
    handleOpenChange(false);
  };

  // Filter team members by search
  const filteredMembers = teamMembers.filter((member) => {
    const search = peopleSearch.toLowerCase();
    return (
      member.name?.toLowerCase().includes(search) ||
      member.email.toLowerCase().includes(search)
    );
  });

  // Get selected assignees
  const selectedAssignees = teamMembers.filter((m) => (currentTask?.assigned_to_ids || []).includes(m.id));

  if (!task || !currentTask) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <div className="flex items-start gap-2 pr-20">
            <div className="flex-1 min-w-0 overflow-hidden">
              {isEditing ? (
                <Input
                  value={currentTask.title}
                  onChange={(e) =>
                    setEditedTask((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="text-lg font-semibold w-full"
                  placeholder="Task title"
                />
              ) : (
                <DialogTitle className="text-lg leading-tight" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                  {currentTask.title}
                </DialogTitle>
              )}
            </div>
          </div>
          {!isEditing && (
            <TooltipProvider>
              <div className="flex items-center gap-1 shrink-0 absolute right-6 top-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleStartEdit}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit task</TooltipContent>
                  </Tooltip>

                  <AlertDialog>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Delete task</TooltipContent>
                    </Tooltip>
                    <AlertDialogContent className="max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Task</AlertDialogTitle>
                        <AlertDialogDescription className="break-all">
                          Are you sure you want to delete &quot;{task.title.length > 50 ? task.title.slice(0, 50) + "..." : task.title}&quot;? This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TooltipProvider>
            )}
          <VisuallyHidden.Root>
            <DialogDescription>
              View and edit task details
            </DialogDescription>
          </VisuallyHidden.Root>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Status & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Status</Label>
              {isEditing ? (
                <Select
                  value={currentTask.status ?? undefined}
                  onValueChange={(v) =>
                    setEditedTask((prev) => ({
                      ...prev,
                      status: v as WhiteboardTask["status"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      <span className={cn("font-medium", STATUS_OPTIONS.find((o) => o.value === currentTask.status)?.textClass)}>
                        {STATUS_OPTIONS.find((o) => o.value === currentTask.status)?.label}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={cn("font-medium", opt.textClass)}>{opt.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className={cn("text-sm font-medium", STATUS_OPTIONS.find((o) => o.value === currentTask.status)?.textClass)}>
                  {STATUS_OPTIONS.find((o) => o.value === currentTask.status)?.label}
                </span>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Flag className="h-3 w-3" />
                Priority
              </Label>
              {isEditing ? (
                <Select
                  value={currentTask.priority || "medium"}
                  onValueChange={(v) =>
                    setEditedTask((prev) => ({
                      ...prev,
                      priority: v as WhiteboardTask["priority"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", opt.color)} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      PRIORITY_OPTIONS.find((o) => o.value === (currentTask.priority || "medium"))
                        ?.color
                    )}
                  />
                  <span className="text-sm">
                    {PRIORITY_OPTIONS.find((o) => o.value === (currentTask.priority || "medium"))
                      ?.label}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Due Date & Assignee Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Due Date */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Due Date
              </Label>
              {isEditing ? (
                <Input
                  type="datetime-local"
                  value={currentTask.due_date?.slice(0, 16) || ""}
                  onChange={(e) =>
                    setEditedTask((prev) => ({
                      ...prev,
                      due_date: e.target.value ? new Date(e.target.value).toISOString() : null,
                    }))
                  }
                />
              ) : currentTask.due_date ? (
                <p className="text-sm">
                  {format(new Date(currentTask.due_date), "MMM d, yyyy 'at' h:mm a")}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not set</p>
              )}
            </div>

            {/* Assignees */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <UserIcon className="h-3 w-3" />
                Assignees
              </Label>
              {isEditing ? (
                <Popover open={peoplePopoverOpen} onOpenChange={setPeoplePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal h-auto min-h-9"
                    >
                      {selectedAssignees.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {selectedAssignees.slice(0, 3).map((assignee) => (
                            <div key={assignee.id} className="flex items-center gap-1 bg-muted rounded px-1.5 py-0.5">
                              <Avatar className="h-4 w-4">
                                <AvatarFallback className="text-[8px]">
                                  {getInitials(assignee.name || assignee.email)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs truncate max-w-[60px]">
                                {assignee.name || assignee.email}
                              </span>
                            </div>
                          ))}
                          {selectedAssignees.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{selectedAssignees.length - 3} more</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Select people</span>
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0" align="start">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search people..."
                          value={peopleSearch}
                          onChange={(e) => setPeopleSearch(e.target.value)}
                          className="pl-8 h-8"
                        />
                      </div>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto p-1">
                      {/* Clear all option */}
                      {(currentTask.assigned_to_ids || []).length > 0 && (
                        <button
                          className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left text-sm text-muted-foreground"
                          onClick={() => setEditedTask((prev) => ({ ...prev, assigned_to_ids: [] }))}
                        >
                          <X className="h-4 w-4" />
                          Clear all ({(currentTask.assigned_to_ids || []).length})
                        </button>
                      )}
                      {filteredMembers.map((member) => {
                        const isSelected = (currentTask.assigned_to_ids || []).includes(member.id);
                        return (
                          <button
                            key={member.id}
                            className={cn(
                              "w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left",
                              isSelected && "bg-muted"
                            )}
                            onClick={() => {
                              const currentIds = currentTask.assigned_to_ids || [];
                              if (isSelected) {
                                setEditedTask((prev) => ({
                                  ...prev,
                                  assigned_to_ids: currentIds.filter((id) => id !== member.id),
                                }));
                              } else {
                                setEditedTask((prev) => ({
                                  ...prev,
                                  assigned_to_ids: [...currentIds, member.id],
                                }));
                              }
                            }}
                          >
                            <Checkbox checked={isSelected} className="pointer-events-none" />
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[9px]">
                                {getInitials(member.name || member.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">
                                {member.name || member.email}
                              </p>
                              {member.name && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {member.email}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                      {filteredMembers.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No team members found
                        </p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : selectedAssignees.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedAssignees.map((assignee) => (
                    <div key={assignee.id} className="flex items-center gap-1.5">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {getInitials(assignee.name || assignee.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{assignee.name || assignee.email}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Unassigned</p>
              )}
            </div>
          </div>

          {/* Color Picker */}
          {isEditing && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Palette className="h-3 w-3" />
                Color
              </Label>
              <div className="flex flex-wrap gap-3">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() =>
                      setEditedTask((prev) => ({ ...prev, color: color.value }))
                    }
                    className={cn(
                      "w-10 h-10 rounded-full transition-all shadow-sm",
                      currentTask.color === color.value
                        ? "ring-2 ring-offset-2 ring-offset-background ring-white scale-110"
                        : "hover:scale-110 hover:shadow-md"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Description</Label>
            {isEditing ? (
              <Textarea
                value={currentTask.description || ""}
                onChange={(e) =>
                  setEditedTask((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Add a description..."
                rows={4}
                className="w-full resize-none"
                style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
              />
            ) : currentTask.description ? (
              <p className="text-sm whitespace-pre-wrap" style={{ wordBreak: "break-all", overflowWrap: "anywhere" }}>{currentTask.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No description</p>
            )}
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Labels
            </Label>
            {isEditing ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1 max-w-full overflow-hidden">
                  {(currentTask.labels || []).map((label, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 max-w-[150px]">
                      <span className="truncate">{label}</span>
                      <button
                        onClick={() => {
                          const newLabels = [...(currentTask.labels || [])];
                          newLabels.splice(i, 1);
                          setEditedTask((prev) => ({ ...prev, labels: newLabels }));
                        }}
                        className="shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="Add label and press Enter..."
                  className="w-full"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const value = (e.target as HTMLInputElement).value.trim();
                      if (value) {
                        setEditedTask((prev) => ({
                          ...prev,
                          labels: [...(currentTask.labels || []), value],
                        }));
                        (e.target as HTMLInputElement).value = "";
                      }
                    }
                  }}
                />
              </div>
            ) : (currentTask.labels || []).length > 0 ? (
              <div className="flex flex-wrap gap-1 overflow-hidden">
                {(currentTask.labels || []).map((label, i) => (
                  <Badge key={i} variant="secondary" className="max-w-[120px] shrink-0">
                    <span className="truncate">{label}</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No labels</p>
            )}
          </div>

          <Separator />

          {/* Subtasks */}
          <TaskSubtasks
            taskId={task.id}
            key={`subtasks-${refreshKey}`}
            isEditing={isEditing}
          />

          <Separator />

          {/* Attachments */}
          <TaskAttachments
            taskId={task.id}
            key={`attachments-${refreshKey}`}
            onSketchClick={() => setSketchDialogOpen(true)}
            isEditing={isEditing}
          />

          <Separator />

          {/* Metadata */}
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>
              Created: {format(new Date(task.created_at || new Date()), "MMM d, yyyy 'at' h:mm a")}
              {task.created_by && (() => {
                const creator = teamMembers.find((m) => m.id === task.created_by);
                return creator ? (
                  <span className="ml-1">
                    by <span className="font-medium text-foreground">{creator.name || creator.email}</span>
                  </span>
                ) : null;
              })()}
            </div>
            <div>
              Updated: {format(new Date(task.updated_at || new Date()), "MMM d, yyyy 'at' h:mm a")}
              {(() => {
                // Show updated_by if available, otherwise show created_by
                const updaterId = (task as any).updated_by || task.created_by;
                if (!updaterId) return null;
                const updater = teamMembers.find((m) => m.id === updaterId);
                return updater ? (
                  <span className="ml-1">
                    by <span className="font-medium text-foreground">{updater.name || updater.email}</span>
                  </span>
                ) : null;
              })()}
            </div>
          </div>

          {/* Edit Actions */}
          {isEditing && (
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isPending || !currentTask.title?.trim()}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Sketch Dialog */}
      <SketchCanvasDialog
        taskId={task.id}
        open={sketchDialogOpen}
        onOpenChange={setSketchDialogOpen}
        onSketchSaved={() => setRefreshKey((k) => k + 1)}
      />
    </Dialog>
  );
}

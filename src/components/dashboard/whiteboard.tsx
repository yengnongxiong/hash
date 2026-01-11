"use client";

import { useState, useEffect, useTransition, useRef, useCallback, useMemo } from "react";
import { WhiteboardTask, User } from "@/types/database";
import { WhiteboardColumn } from "./whiteboard-column";
import { WhiteboardTable } from "./whiteboard-table";
import { TaskDetailDialog } from "./task-detail-dialog";
import { CreateTaskDialog } from "./create-task-dialog";
import { createClient } from "@/lib/supabase/client";
import {
  updateWhiteboardTaskStatus,
  deleteWhiteboardTask,
  reorderWhiteboardTasks,
} from "@/app/(dashboard)/tasks/actions";
import { toast } from "sonner";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Kanban, List, Search, Plus, Download, EyeOff, Eye, X } from "lucide-react";
import { TaskCSVImportDialog } from "./task-csv-import-dialog";
import { exportToCSV, formatDateTime } from "@/lib/export";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface WhiteboardProps {
  initialTasks: WhiteboardTask[];
  organizationId: string;
  teamMembers?: Pick<User, "id" | "name" | "email">[];
}

const columns = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "done", title: "Done" },
] as const;

type ColumnId = (typeof columns)[number]["id"];

const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

// Local storage key for hidden tasks
const HIDDEN_TASKS_KEY = "whiteboard_hidden_tasks";

export function Whiteboard({ initialTasks, organizationId, teamMembers = [] }: WhiteboardProps) {
  const [tasks, setTasks] = useState<WhiteboardTask[]>(initialTasks);
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"table" | "kanban">("table");
  const [selectedTask, setSelectedTask] = useState<WhiteboardTask | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hiddenTaskIds, setHiddenTaskIds] = useState<Set<string>>(new Set());
  const [showHiddenPopover, setShowHiddenPopover] = useState(false);

  // Cursor glow effect
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const boardRef = useRef<HTMLDivElement>(null);

  // Use ref to track hiddenTaskIds in realtime callback without causing re-subscription
  const hiddenTaskIdsRef = useRef<Set<string>>(hiddenTaskIds);
  useEffect(() => {
    hiddenTaskIdsRef.current = hiddenTaskIds;
  }, [hiddenTaskIds]);

  // Load hidden tasks from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HIDDEN_TASKS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHiddenTaskIds(new Set(parsed));
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save hidden tasks to local storage
  const saveHiddenTasks = (ids: Set<string>) => {
    setHiddenTaskIds(ids);
    try {
      localStorage.setItem(HIDDEN_TASKS_KEY, JSON.stringify([...ids]));
    } catch {
      // Ignore storage errors
    }
  };

  const handleHideTask = (taskId: string) => {
    const newHidden = new Set(hiddenTaskIds);
    newHidden.add(taskId);
    saveHiddenTasks(newHidden);
    toast.success("Task hidden from Kanban", {
      description: "You can restore it from the hidden tasks menu",
    });
  };

  const handleUnhideTask = (taskId: string) => {
    const newHidden = new Set(hiddenTaskIds);
    newHidden.delete(taskId);
    saveHiddenTasks(newHidden);
    toast.success("Task restored to Kanban");
  };

  const handleUnhideAll = () => {
    saveHiddenTasks(new Set());
    setShowHiddenPopover(false);
    toast.success("All tasks restored to Kanban");
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  // Filter tasks by search query (across all fields like table view)
  const filteredTasks = tasks.filter((task) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();

    // Search in title
    if (task.title.toLowerCase().includes(query)) return true;

    // Search in description
    if (task.description?.toLowerCase().includes(query)) return true;

    // Search in status label
    const statusKey = (task.status || "todo") as keyof typeof STATUS_LABELS;
    const statusLabel = STATUS_LABELS[statusKey] || "";
    if (statusLabel.toLowerCase().includes(query)) return true;

    // Search in priority label
    const priorityKey = (task.priority || "medium") as keyof typeof PRIORITY_LABELS;
    const priorityLabel = PRIORITY_LABELS[priorityKey] || "";
    if (priorityLabel.toLowerCase().includes(query)) return true;

    // Search in due date (formatted)
    if (task.due_date) {
      const formattedDate = format(new Date(task.due_date), "MMM d, yyyy");
      if (formattedDate.toLowerCase().includes(query)) return true;
      if (task.due_date.toLowerCase().includes(query)) return true;
    }

    // Search in labels
    if (task.labels?.some((label) => label.toLowerCase().includes(query))) return true;

    // Search in assignee names/emails
    const assignedToIds = task.assigned_to_ids || [];
    const assignedTo = task.assigned_to;

    for (const id of assignedToIds) {
      const member = teamMembers.find((m) => m.id === id);
      if (member) {
        if (member.name?.toLowerCase().includes(query)) return true;
        if (member.email.toLowerCase().includes(query)) return true;
      }
    }

    if (assignedTo) {
      const member = teamMembers.find((m) => m.id === assignedTo);
      if (member) {
        if (member.name?.toLowerCase().includes(query)) return true;
        if (member.email.toLowerCase().includes(query)) return true;
      }
    }

    // Search "unassigned" text
    if (assignedToIds.length === 0 && !assignedTo && "unassigned".includes(query)) return true;

    return false;
  });

  // Get hidden tasks that still exist
  const hiddenTasks = tasks.filter((t) => hiddenTaskIds.has(t.id));

  // Handle task click
  const handleTaskClick = (task: WhiteboardTask) => {
    setSelectedTask(task);
    setIsDetailDialogOpen(true);
  };

  // Handle task created from dialog
  const handleTaskCreated = (task: WhiteboardTask) => {
    setTasks((prev) => {
      if (prev.find((t) => t.id === task.id)) {
        return prev;
      }
      return [...prev, task];
    });
  };

  // Handle task update from dialog
  const handleTaskUpdate = (updatedTask: WhiteboardTask) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    setSelectedTask(updatedTask);
  };

  // Handle tasks imported from CSV
  const handleTasksImported = (importedTasks: WhiteboardTask[]) => {
    setTasks((prev) => {
      const existingIds = new Set(prev.map((t) => t.id));
      const newTasks = importedTasks.filter((t) => !existingIds.has(t.id));
      return [...prev, ...newTasks];
    });
  };

  // Handle export to CSV
  const handleExportCSV = () => {
    if (filteredTasks.length === 0) {
      toast.error("No tasks to export");
      return;
    }

    // Helper to get assignee names
    const getAssigneeNames = (task: WhiteboardTask) => {
      const ids = task.assigned_to_ids || [];
      if (ids.length === 0 && task.assigned_to) {
        const member = teamMembers.find((m) => m.id === task.assigned_to);
        return member ? (member.name || member.email) : "";
      }
      return ids
        .map((id) => {
          const member = teamMembers.find((m) => m.id === id);
          return member ? (member.name || member.email) : "";
        })
        .filter(Boolean)
        .join(", ");
    };

    const tasksWithAssignees = filteredTasks.map((task) => ({
      ...task,
      assignee_names: getAssigneeNames(task),
    }));

    exportToCSV(
      tasksWithAssignees,
      `tasks_${new Date().toISOString().split("T")[0]}`,
      [
        { key: "title", label: "Title" },
        { key: "description", label: "Description", format: (v) => String(v ?? "") },
        { key: "status", label: "Status", format: (v) => STATUS_LABELS[v as string] || String(v) },
        { key: "priority", label: "Priority", format: (v) => PRIORITY_LABELS[v as string] || String(v) },
        { key: "due_date", label: "Due Date", format: (v) => formatDateTime(v as string | null) },
        { key: "assignee_names" as keyof typeof tasksWithAssignees[0], label: "Assignees" },
        { key: "color", label: "Color" },
        { key: "labels", label: "Labels", format: (v) => (v as string[] || []).join(", ") },
        { key: "created_at", label: "Created At", format: (v) => formatDateTime(v as string) },
      ]
    );
    toast.success(`Exported ${filteredTasks.length} tasks`);
  };

  // Set up realtime subscription (no dependency on hiddenTaskIds - use ref instead)
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("tasks_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTasks((prev) => {
              if (prev.find((t) => t.id === (payload.new as WhiteboardTask).id)) {
                return prev;
              }
              return [...prev, payload.new as WhiteboardTask];
            });
          } else if (payload.eventType === "UPDATE") {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === (payload.new as WhiteboardTask).id
                  ? (payload.new as WhiteboardTask)
                  : t
              )
            );
          } else if (payload.eventType === "DELETE") {
            setTasks((prev) =>
              prev.filter((t) => t.id !== (payload.old as WhiteboardTask).id)
            );
            // Use ref to access current hiddenTaskIds without causing re-subscription
            const deletedId = (payload.old as WhiteboardTask).id;
            if (hiddenTaskIdsRef.current.has(deletedId)) {
              const newHidden = new Set(hiddenTaskIdsRef.current);
              newHidden.delete(deletedId);
              saveHiddenTasks(newHidden);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    // Also remove from hidden
    if (hiddenTaskIds.has(taskId)) {
      const newHidden = new Set(hiddenTaskIds);
      newHidden.delete(taskId);
      saveHiddenTasks(newHidden);
    }

    startTransition(async () => {
      const result = await deleteWhiteboardTask(taskId);
      if (result.error) {
        toast.error("Failed to delete task", { description: result.error });
      }
    });
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceStatus = source.droppableId as ColumnId;
    const destStatus = destination.droppableId as ColumnId;
    const columnTitle = columns.find(c => c.id === destStatus)?.title || destStatus;

    const sourceTasks = tasks
      .filter((t) => t.status === sourceStatus && !hiddenTaskIds.has(t.id))
      .sort((a, b) => ((a as any).position || 0) - ((b as any).position || 0));

    const destTasks = sourceStatus === destStatus
      ? sourceTasks
      : tasks
          .filter((t) => t.status === destStatus && !hiddenTaskIds.has(t.id))
          .sort((a, b) => ((a as any).position || 0) - ((b as any).position || 0));

    const draggedTask = tasks.find((t) => t.id === draggableId);
    if (!draggedTask) return;

    const updates: { id: string; status: "todo" | "in_progress" | "done"; position: number }[] = [];

    if (sourceStatus === destStatus) {
      const reorderedTasks = [...sourceTasks];
      const [removed] = reorderedTasks.splice(source.index, 1);
      reorderedTasks.splice(destination.index, 0, removed);

      reorderedTasks.forEach((task, index) => {
        updates.push({ id: task.id, status: destStatus, position: index });
      });

      setTasks((prev) => {
        const newTasks = [...prev];
        reorderedTasks.forEach((task, index) => {
          const taskIndex = newTasks.findIndex((t) => t.id === task.id);
          if (taskIndex !== -1) {
            (newTasks[taskIndex] as any).position = index;
          }
        });
        return newTasks;
      });
    } else {
      const newSourceTasks = sourceTasks.filter((t) => t.id !== draggableId);
      newSourceTasks.forEach((task, index) => {
        updates.push({ id: task.id, status: sourceStatus, position: index });
      });

      const newDestTasks = [...destTasks];
      newDestTasks.splice(destination.index, 0, draggedTask);
      newDestTasks.forEach((task, index) => {
        updates.push({ id: task.id, status: destStatus, position: index });
      });

      setTasks((prev) => {
        const newTasks = prev.map((t) => {
          if (t.id === draggableId) {
            return { ...t, status: destStatus, position: destination.index } as any;
          }
          const sourceTask = newSourceTasks.find((st) => st.id === t.id);
          if (sourceTask) {
            const idx = newSourceTasks.indexOf(sourceTask);
            return { ...t, position: idx } as any;
          }
          const destTask = destTasks.find((dt) => dt.id === t.id);
          if (destTask) {
            const idx = newDestTasks.indexOf(destTask);
            return { ...t, position: idx } as any;
          }
          return t;
        });
        return newTasks;
      });
    }

    startTransition(async () => {
      const result = await reorderWhiteboardTasks(updates);
      if (result.error) {
        toast.error("Failed to reorder tasks", { description: result.error });
      } else if (sourceStatus !== destStatus) {
        toast.success(`Task moved to ${columnTitle}`);
      }
    });
  };

  const getTasksByColumn = useCallback(
    (columnId: ColumnId) =>
      filteredTasks
        .filter((t) => t.status === columnId && !hiddenTaskIds.has(t.id))
        .sort((a, b) => ((a as any).position || 0) - ((b as any).position || 0)),
    [filteredTasks, hiddenTaskIds]
  );

  const handleMoveTask = async (taskId: string, newStatus: ColumnId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status === newStatus) {
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    startTransition(async () => {
      const result = await updateWhiteboardTaskStatus(taskId, newStatus);
      if (result.error) {
        toast.error("Failed to move task", { description: result.error });
        if (task) {
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
          );
        }
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with View Toggle and Add Task */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        {/* Search - only shown for Kanban view (Table has its own) */}
        {view === "kanban" && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* View Toggle and Action Buttons */}
        <div className={`flex items-center gap-2 ${view === "table" ? "w-full justify-end" : ""}`}>
          <Tabs value={view} onValueChange={(v) => setView(v as "table" | "kanban")}>
            <TabsList>
              <TabsTrigger value="table" className="gap-1.5">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Table</span>
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-1.5">
                <Kanban className="h-4 w-4" />
                <span className="hidden sm:inline">Kanban</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Hidden tasks button - only in Kanban view */}
          {view === "kanban" && hiddenTasks.length > 0 && (
            <Popover open={showHiddenPopover} onOpenChange={setShowHiddenPopover}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <EyeOff className="h-4 w-4" />
                  <span className="hidden sm:inline">Hidden</span>
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {hiddenTasks.length}
                  </Badge>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Hidden Tasks</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleUnhideAll}
                    >
                      Restore All
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    These tasks are hidden from the Kanban board but still exist in the table view.
                  </p>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                  {hiddenTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {STATUS_LABELS[(task.status || "todo") as keyof typeof STATUS_LABELS]}
                        </p>
                      </div>
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleUnhideTask(task.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Restore to Kanban</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          <TaskCSVImportDialog
            organizationId={organizationId}
            onTasksImported={handleTasksImported}
          />
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Task</span>
          </Button>
        </div>
      </div>

      {/* Views */}
      {view === "table" ? (
        <WhiteboardTable
          tasks={filteredTasks}
          onTaskClick={handleTaskClick}
          onDeleteTasks={(tasksToDelete) => {
            tasksToDelete.forEach((task) => handleDeleteTask(task.id));
          }}
          onStatusChange={handleMoveTask}
          teamMembers={teamMembers}
        />
      ) : (
        <div
          ref={boardRef}
          onMouseMove={handleMouseMove}
          className="relative rounded-lg overflow-hidden"
          style={{
            background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(120, 119, 198, 0.08), transparent 40%)`,
          }}
        >
          <DragDropContext onDragEnd={handleDragEnd}>
            <div
              className={cn(
                "grid grid-cols-1 md:grid-cols-3 gap-4 p-1 transition-opacity",
                isPending && "opacity-70"
              )}
            >
              {columns.map((column) => (
                <WhiteboardColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  tasks={getTasksByColumn(column.id)}
                  onDeleteTask={handleDeleteTask}
                  onHideTask={handleHideTask}
                  onTaskClick={handleTaskClick}
                  teamMembers={teamMembers}
                />
              ))}
            </div>
          </DragDropContext>
        </div>
      )}

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        onTaskUpdate={handleTaskUpdate}
        onTaskDelete={handleDeleteTask}
        teamMembers={teamMembers}
      />

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onTaskCreated={handleTaskCreated}
        organizationId={organizationId}
        teamMembers={teamMembers}
      />
    </div>
  );
}

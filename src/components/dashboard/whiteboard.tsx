"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import { WhiteboardTask, User } from "@/types/database";
import { WhiteboardColumn } from "./whiteboard-column";
import { WhiteboardCanvas } from "./whiteboard-canvas";
import { TaskDetailDialog } from "./task-detail-dialog";
import { CreateTaskDialog } from "./create-task-dialog";
import { createClient } from "@/lib/supabase/client";
import {
  updateWhiteboardTaskStatus,
  deleteWhiteboardTask,
  reorderWhiteboardTasks,
} from "@/app/(dashboard)/whiteboard/actions";
import { toast } from "sonner";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kanban, LayoutGrid, Search, Plus } from "lucide-react";

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

export function Whiteboard({ initialTasks, organizationId, teamMembers = [] }: WhiteboardProps) {
  const [tasks, setTasks] = useState<WhiteboardTask[]>(initialTasks);
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"kanban" | "board">("kanban");
  const [selectedTask, setSelectedTask] = useState<WhiteboardTask | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Cursor glow effect
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const boardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  // Filter tasks by search query
  const filteredTasks = tasks.filter((task) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query) ||
      task.labels?.some((label) => label.toLowerCase().includes(query))
    );
  });

  // Handle task click
  const handleTaskClick = (task: WhiteboardTask) => {
    setSelectedTask(task);
    setIsDetailDialogOpen(true);
  };

  // Handle task created from dialog
  const handleTaskCreated = (task: WhiteboardTask) => {
    // Optimistic update - realtime will also sync
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

  // Set up realtime subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("whiteboard_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whiteboard_tasks",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTasks((prev) => {
              // Don't add if already exists (from optimistic update)
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
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDeleteTask = async (taskId: string) => {
    // Optimistic delete
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    startTransition(async () => {
      const result = await deleteWhiteboardTask(taskId);
      if (result.error) {
        toast.error("Failed to delete task", { description: result.error });
        // Revert - the realtime will sync the correct state
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

    // Get current tasks in source and destination columns (sorted by position)
    const sourceTasks = tasks
      .filter((t) => t.status === sourceStatus)
      .sort((a, b) => ((a as any).position || 0) - ((b as any).position || 0));

    const destTasks = sourceStatus === destStatus
      ? sourceTasks
      : tasks
          .filter((t) => t.status === destStatus)
          .sort((a, b) => ((a as any).position || 0) - ((b as any).position || 0));

    // Find the dragged task
    const draggedTask = tasks.find((t) => t.id === draggableId);
    if (!draggedTask) return;

    // Calculate new positions
    const updates: { id: string; status: "todo" | "in_progress" | "done"; position: number }[] = [];

    if (sourceStatus === destStatus) {
      // Reordering within the same column
      const reorderedTasks = [...sourceTasks];
      const [removed] = reorderedTasks.splice(source.index, 1);
      reorderedTasks.splice(destination.index, 0, removed);

      // Update positions for all tasks in this column
      reorderedTasks.forEach((task, index) => {
        updates.push({ id: task.id, status: destStatus, position: index });
      });

      // Optimistic update
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
      // Moving to a different column
      // Remove from source
      const newSourceTasks = sourceTasks.filter((t) => t.id !== draggableId);
      newSourceTasks.forEach((task, index) => {
        updates.push({ id: task.id, status: sourceStatus, position: index });
      });

      // Add to destination at the correct position
      const newDestTasks = [...destTasks];
      newDestTasks.splice(destination.index, 0, draggedTask);
      newDestTasks.forEach((task, index) => {
        updates.push({ id: task.id, status: destStatus, position: index });
      });

      // Optimistic update
      setTasks((prev) => {
        const newTasks = prev.map((t) => {
          if (t.id === draggableId) {
            return { ...t, status: destStatus, position: destination.index } as any;
          }
          // Update positions for source column
          const sourceTask = newSourceTasks.find((st) => st.id === t.id);
          if (sourceTask) {
            const idx = newSourceTasks.indexOf(sourceTask);
            return { ...t, position: idx } as any;
          }
          // Update positions for dest column (excluding dragged)
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

  const getTasksByColumn = (columnId: ColumnId) =>
    filteredTasks
      .filter((t) => t.status === columnId)
      .sort((a, b) => ((a as any).position || 0) - ((b as any).position || 0));

  const handleMoveTask = async (taskId: string, newStatus: ColumnId) => {
    // Check if status actually changed
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status === newStatus) {
      return; // No change needed
    }

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    startTransition(async () => {
      const result = await updateWhiteboardTaskStatus(taskId, newStatus);
      if (result.error) {
        toast.error("Failed to move task", { description: result.error });
        // Revert optimistic update on error
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
      {/* Header with Search and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* View Toggle and Add Task Button */}
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as "kanban" | "board")}>
            <TabsList>
              <TabsTrigger value="kanban" className="gap-1.5">
                <Kanban className="h-4 w-4" />
                <span className="hidden sm:inline">Kanban</span>
              </TabsTrigger>
              <TabsTrigger value="board" className="gap-1.5">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Board</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Task</span>
          </Button>
        </div>
      </div>

      {/* Board with cursor glow effect */}
      <div
        ref={boardRef}
        onMouseMove={handleMouseMove}
        className="relative rounded-lg overflow-hidden"
        style={{
          background: view === "kanban"
            ? `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(120, 119, 198, 0.08), transparent 40%)`
            : undefined,
        }}
      >
        {/* Views */}
        {view === "kanban" ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div
              className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-1 ${
                isPending ? "opacity-70" : ""
              }`}
            >
              {columns.map((column) => (
                <WhiteboardColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  tasks={getTasksByColumn(column.id)}
                  onDeleteTask={handleDeleteTask}
                  onTaskClick={handleTaskClick}
                />
              ))}
            </div>
          </DragDropContext>
        ) : (
          <WhiteboardCanvas
            tasks={filteredTasks}
            onDeleteTask={handleDeleteTask}
            onDragEnd={handleDragEnd}
            onTaskClick={handleTaskClick}
            organizationId={organizationId}
            isPending={isPending}
            mousePos={mousePos}
          />
        )}
      </div>

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

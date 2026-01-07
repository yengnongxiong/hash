"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import { WhiteboardTask, User } from "@/types/database";
import { WhiteboardColumn } from "./whiteboard-column";
import { WhiteboardGallery } from "./whiteboard-gallery";
import { TaskDetailDialog } from "./task-detail-dialog";
import { createClient } from "@/lib/supabase/client";
import {
  createWhiteboardTask,
  updateWhiteboardTaskStatus,
  deleteWhiteboardTask,
} from "@/app/(dashboard)/whiteboard/actions";
import { toast } from "sonner";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Kanban, LayoutGrid, Search } from "lucide-react";

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
  const [view, setView] = useState<"kanban" | "gallery">("kanban");
  const [selectedTask, setSelectedTask] = useState<WhiteboardTask | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
    setIsDialogOpen(true);
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

  const handleAddTask = async (title: string, columnId: ColumnId) => {
    startTransition(async () => {
      const result = await createWhiteboardTask(organizationId, title, columnId);
      if (result.error) {
        toast.error("Failed to create task", { description: result.error });
      } else if (result.task) {
        // Optimistic update already handled by realtime
        toast.success("Task created");
      }
    });
  };

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

    const newStatus = destination.droppableId as ColumnId;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === draggableId ? { ...t, status: newStatus } : t))
    );

    startTransition(async () => {
      const result = await updateWhiteboardTaskStatus(draggableId, newStatus);
      if (result.error) {
        toast.error("Failed to move task", { description: result.error });
      }
    });
  };

  const getTasksByColumn = (columnId: ColumnId) =>
    filteredTasks.filter((t) => t.status === columnId);

  const handleMoveTask = async (taskId: string, newStatus: ColumnId) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    startTransition(async () => {
      const result = await updateWhiteboardTaskStatus(taskId, newStatus);
      if (result.error) {
        toast.error("Failed to move task", { description: result.error });
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

        {/* View Toggle */}
        <Tabs value={view} onValueChange={(v) => setView(v as "kanban" | "gallery")}>
          <TabsList>
            <TabsTrigger value="kanban" className="gap-1.5">
              <Kanban className="h-4 w-4" />
              <span className="hidden sm:inline">Kanban</span>
            </TabsTrigger>
            <TabsTrigger value="gallery" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Board</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
                  onAddTask={(title) => handleAddTask(title, column.id)}
                  onDeleteTask={handleDeleteTask}
                  onTaskClick={handleTaskClick}
                />
              ))}
            </div>
          </DragDropContext>
        ) : (
          <WhiteboardGallery
            tasks={filteredTasks}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            onMoveTask={handleMoveTask}
            onTaskClick={handleTaskClick}
            isPending={isPending}
            mousePos={mousePos}
          />
        )}
      </div>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onTaskUpdate={handleTaskUpdate}
        onTaskDelete={handleDeleteTask}
        teamMembers={teamMembers}
      />
    </div>
  );
}

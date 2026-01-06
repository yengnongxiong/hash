"use client";

import { useState, useEffect, useTransition } from "react";
import { WhiteboardTask } from "@/types/database";
import { WhiteboardColumn } from "./whiteboard-column";
import { createClient } from "@/lib/supabase/client";
import {
  createWhiteboardTask,
  updateWhiteboardTaskStatus,
  deleteWhiteboardTask,
} from "@/app/(dashboard)/whiteboard/actions";
import { toast } from "sonner";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";

interface WhiteboardProps {
  initialTasks: WhiteboardTask[];
  organizationId: string;
}

const columns = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "done", title: "Done" },
] as const;

type ColumnId = (typeof columns)[number]["id"];

export function Whiteboard({ initialTasks, organizationId }: WhiteboardProps) {
  const [tasks, setTasks] = useState<WhiteboardTask[]>(initialTasks);
  const [isPending, startTransition] = useTransition();

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
    tasks.filter((t) => t.status === columnId);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div
        className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${
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
          />
        ))}
      </div>
    </DragDropContext>
  );
}

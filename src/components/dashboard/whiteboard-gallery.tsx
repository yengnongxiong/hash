"use client";

import { useState } from "react";
import { WhiteboardTask } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { formatDistanceToNow } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface WhiteboardGalleryProps {
  tasks: WhiteboardTask[];
  onAddTask: (title: string, status: "todo" | "in_progress" | "done") => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, newStatus: "todo" | "in_progress" | "done") => void;
  isPending?: boolean;
}

const STATUS_CONFIG = {
  todo: {
    label: "To Do",
    color: "bg-yellow-200 dark:bg-yellow-900/50",
    noteColor: "bg-yellow-100 dark:bg-yellow-900/30",
    borderColor: "border-yellow-300 dark:border-yellow-700",
    rotation: "-rotate-1",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-200 dark:bg-blue-900/50",
    noteColor: "bg-blue-100 dark:bg-blue-900/30",
    borderColor: "border-blue-300 dark:border-blue-700",
    rotation: "rotate-1",
  },
  done: {
    label: "Done",
    color: "bg-green-200 dark:bg-green-900/50",
    noteColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-300 dark:border-green-700",
    rotation: "-rotate-2",
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

function StickyNote({
  task,
  index,
  onDelete,
}: {
  task: WhiteboardTask;
  index: number;
  onDelete: () => void;
}) {
  const status = task.status as StatusKey;
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.todo;

  // Alternate rotation for visual variety
  const rotations = ["-rotate-1", "rotate-1", "-rotate-2", "rotate-2", "rotate-0"];
  const rotation = rotations[index % rotations.length];

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "w-40 h-40 p-3 shadow-md cursor-grab active:cursor-grabbing group relative transition-all duration-200",
            config.noteColor,
            config.borderColor,
            "border-2 rounded-sm",
            snapshot.isDragging ? "shadow-xl scale-105 rotate-0 z-50" : rotation,
            "hover:scale-105 hover:shadow-lg hover:z-10"
          )}
          style={{
            ...provided.draggableProps.style,
            backgroundColor: task.color !== "#ffffff" ? task.color : undefined,
          }}
        >
          {/* Pin effect */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 shadow-md border-2 border-red-600" />

          {/* Drag handle */}
          <div
            {...provided.dragHandleProps}
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Delete button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>

          {/* Content */}
          <div className="h-full flex flex-col">
            <p className="text-sm font-medium line-clamp-4 flex-1">{task.title}</p>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground mt-auto pt-2">
              {formatDistanceToNow(new Date(task.created_at))}
            </p>
          </div>
        </div>
      )}
    </Draggable>
  );
}

function AddNoteButton({
  status,
  onAdd,
}: {
  status: StatusKey;
  onAdd: (title: string) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const config = STATUS_CONFIG[status];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd(title.trim());
      setTitle("");
      setIsAdding(false);
    }
  };

  if (isAdding) {
    return (
      <form
        onSubmit={handleSubmit}
        className={cn(
          "w-40 h-40 p-3 shadow-md rounded-sm border-2 border-dashed",
          config.borderColor,
          "bg-background/50"
        )}
      >
        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title..."
          className="text-sm h-8 mb-2"
          onBlur={() => {
            if (!title.trim()) setIsAdding(false);
          }}
        />
        <div className="flex gap-1">
          <Button type="submit" size="sm" className="flex-1 h-7 text-xs">
            Add
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setTitle("");
              setIsAdding(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className={cn(
        "w-40 h-40 p-3 rounded-sm border-2 border-dashed flex items-center justify-center",
        config.borderColor,
        "text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      )}
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}

export function WhiteboardGallery({
  tasks,
  onAddTask,
  onDeleteTask,
  onMoveTask,
  isPending,
}: WhiteboardGalleryProps) {
  const handleDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;

    const newStatus = destination.droppableId as StatusKey;
    onMoveTask(draggableId, newStatus);
  };

  const getTasksByStatus = (status: StatusKey) =>
    tasks.filter((t) => t.status === status);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div
        className={cn(
          "min-h-[calc(100vh-250px)] rounded-lg p-6 transition-opacity",
          "bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100",
          "dark:from-amber-950/30 dark:via-stone-900 dark:to-orange-950/30",
          "border-8 border-amber-800/20 dark:border-amber-900/50",
          "shadow-inner",
          isPending && "opacity-70"
        )}
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(245, 158, 11, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(249, 115, 22, 0.1) 0%, transparent 50%),
            url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h100v100H0z' fill='none'/%3E%3Cpath d='M0 50h100M50 0v100' stroke='%23d4a373' stroke-width='0.5' stroke-opacity='0.2'/%3E%3C/svg%3E")
          `,
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {(Object.keys(STATUS_CONFIG) as StatusKey[]).map((status) => {
            const config = STATUS_CONFIG[status];
            const statusTasks = getTasksByStatus(status);

            return (
              <div key={status} className="space-y-4">
                {/* Section header */}
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      "text-xs font-semibold px-3 py-1",
                      config.color,
                      "text-foreground border-0"
                    )}
                  >
                    {config.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {statusTasks.length}
                  </span>
                </div>

                {/* Drop zone */}
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "min-h-[200px] p-4 rounded-lg transition-colors",
                        snapshot.isDraggingOver && "bg-accent/30 ring-2 ring-primary/50"
                      )}
                    >
                      <div className="flex flex-wrap gap-4 justify-start">
                        {statusTasks.map((task, index) => (
                          <StickyNote
                            key={task.id}
                            task={task}
                            index={index}
                            onDelete={() => onDeleteTask(task.id)}
                          />
                        ))}
                        {provided.placeholder}
                        <AddNoteButton
                          status={status}
                          onAdd={(title) => onAddTask(title, status)}
                        />
                      </div>
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

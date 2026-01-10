"use client";

import { useState, useTransition, useEffect } from "react";
import { TaskSubtask } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createTaskSubtask,
  updateTaskSubtask,
  deleteTaskSubtask,
  getTaskSubtasks,
} from "@/app/(dashboard)/tasks/actions";

interface TaskSubtasksProps {
  taskId: string;
  isEditing?: boolean;
}

export function TaskSubtasks({ taskId, isEditing = false }: TaskSubtasksProps) {
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch subtasks on mount
  useEffect(() => {
    const fetchSubtasks = async () => {
      setIsLoading(true);
      const result = await getTaskSubtasks(taskId);
      if (result.subtasks) {
        setSubtasks(result.subtasks);
      }
      setIsLoading(false);
    };
    fetchSubtasks();
  }, [taskId]);

  const completedCount = subtasks.filter((s) => s.completed).length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;

    startTransition(async () => {
      const result = await createTaskSubtask(taskId, newSubtask.trim());
      if (result.error) {
        toast.error("Failed to add subtask", { description: result.error });
      } else if (result.subtask) {
        setSubtasks((prev) => [...prev, result.subtask!]);
        setNewSubtask("");
      }
    });
  };

  const handleToggleSubtask = (subtaskId: string, completed: boolean) => {
    setLoadingId(subtaskId);

    // Optimistic update
    setSubtasks((prev) =>
      prev.map((s) => (s.id === subtaskId ? { ...s, completed } : s))
    );

    startTransition(async () => {
      const result = await updateTaskSubtask(subtaskId, { completed });
      if (result.error) {
        toast.error("Failed to update subtask", { description: result.error });
        // Revert on error
        setSubtasks((prev) =>
          prev.map((s) =>
            s.id === subtaskId ? { ...s, completed: !completed } : s
          )
        );
      }
      setLoadingId(null);
    });
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    setLoadingId(subtaskId);

    startTransition(async () => {
      const result = await deleteTaskSubtask(subtaskId);
      if (result.error) {
        toast.error("Failed to delete subtask", { description: result.error });
      } else {
        setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
      }
      setLoadingId(null);
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <ListChecks className="h-3 w-3" />
          Subtasks
        </Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading subtasks...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        <ListChecks className="h-3 w-3" />
        Subtasks
        {totalCount > 0 && (
          <span className="ml-1">
            ({completedCount}/{totalCount})
          </span>
        )}
      </Label>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Subtask list */}
      {subtasks.length > 0 && (
        <div className="space-y-1">
          {subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded-md group min-w-0",
                "hover:bg-muted/50 transition-colors"
              )}
            >
              <Checkbox
                checked={subtask.completed}
                onCheckedChange={(checked) =>
                  handleToggleSubtask(subtask.id, checked as boolean)
                }
                disabled={loadingId === subtask.id}
                className="shrink-0"
              />
              <span
                className={cn(
                  "flex-1 text-sm min-w-0 break-all",
                  subtask.completed && "line-through text-muted-foreground"
                )}
              >
                {subtask.title}
              </span>
              {isEditing && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDeleteSubtask(subtask.id)}
                  disabled={loadingId === subtask.id}
                >
                  {loadingId === subtask.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3 text-destructive" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add subtask form - only show in edit mode */}
      {isEditing && (
        <form onSubmit={handleAddSubtask} className="flex gap-2">
          <Input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            placeholder="Add a subtask..."
            className="h-8 text-sm"
            disabled={isPending}
          />
          <Button
            type="submit"
            size="sm"
            className="h-8"
            disabled={isPending || !newSubtask.trim()}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </form>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { WhiteboardTask } from "@/types/database";
import { WhiteboardTaskCard } from "./whiteboard-task";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { Droppable } from "@hello-pangea/dnd";

interface WhiteboardColumnProps {
  id: string;
  title: string;
  tasks: WhiteboardTask[];
  onAddTask: (title: string) => void;
  onDeleteTask: (taskId: string) => void;
  onTaskClick?: (task: WhiteboardTask) => void;
}

export function WhiteboardColumn({
  id,
  title,
  tasks,
  onAddTask,
  onDeleteTask,
  onTaskClick,
}: WhiteboardColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      onAddTask(newTitle.trim());
      setNewTitle("");
      setIsAdding(false);
    }
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-250px)] min-h-[400px]">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>{title}</span>
          <span className="text-muted-foreground font-normal">{tasks.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 px-2 pb-2 overflow-hidden">
        <Droppable droppableId={id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`h-full overflow-y-auto space-y-2 rounded-md p-1 transition-colors ${
                snapshot.isDraggingOver ? "bg-accent/50" : ""
              }`}
            >
              {tasks.map((task, index) => (
                <WhiteboardTaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onDelete={() => onDeleteTask(task.id)}
                  onClick={() => onTaskClick?.(task)}
                />
              ))}
              {provided.placeholder}

              {isAdding ? (
                <form onSubmit={handleSubmit} className="p-2">
                  <Input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Task title..."
                    className="mb-2"
                    onBlur={() => {
                      if (!newTitle.trim()) setIsAdding(false);
                    }}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="flex-1">
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNewTitle("");
                        setIsAdding(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => setIsAdding(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add task
                </Button>
              )}
            </div>
          )}
        </Droppable>
      </CardContent>
    </Card>
  );
}

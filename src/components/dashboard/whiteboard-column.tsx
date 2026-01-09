"use client";

import { WhiteboardTask, User } from "@/types/database";
import { WhiteboardTaskCard } from "./whiteboard-task";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droppable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, ListTodo } from "lucide-react";

interface WhiteboardColumnProps {
  id: string;
  title: string;
  tasks: WhiteboardTask[];
  onDeleteTask: (taskId: string) => void;
  onHideTask?: (taskId: string) => void;
  onTaskClick?: (task: WhiteboardTask) => void;
  teamMembers?: Pick<User, "id" | "name" | "email">[];
}

const COLUMN_CONFIG = {
  todo: {
    icon: ListTodo,
    badgeClass: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    dropClass: "bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/30",
    emptyText: "No tasks to do",
  },
  in_progress: {
    icon: Clock,
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    dropClass: "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30",
    emptyText: "No tasks in progress",
  },
  done: {
    icon: CheckCircle2,
    badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    dropClass: "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30",
    emptyText: "No completed tasks",
  },
};

export function WhiteboardColumn({
  id,
  title,
  tasks,
  onDeleteTask,
  onHideTask,
  onTaskClick,
  teamMembers = [],
}: WhiteboardColumnProps) {
  const config = COLUMN_CONFIG[id as keyof typeof COLUMN_CONFIG] || COLUMN_CONFIG.todo;
  const Icon = config.icon;

  return (
    <Card className="flex flex-col h-[calc(100vh-250px)] min-h-[400px] overflow-hidden">
      <CardHeader className="py-3 px-4 border-b bg-muted/30">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span>{title}</span>
          </div>
          <Badge variant="secondary" className={cn("text-xs font-normal", config.badgeClass)}>
            {tasks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-2 overflow-hidden">
        <Droppable droppableId={id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "h-full overflow-y-auto rounded-lg p-2 transition-all duration-200 border-2 border-dashed",
                snapshot.isDraggingOver
                  ? cn(config.dropClass, "border-solid")
                  : "border-transparent",
                tasks.length === 0 && !snapshot.isDraggingOver && "border-muted-foreground/20"
              )}
            >
              {tasks.length === 0 && !snapshot.isDraggingOver && (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground italic">{config.emptyText}</p>
                </div>
              )}
              {tasks.map((task, index) => (
                <WhiteboardTaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onDelete={() => onDeleteTask(task.id)}
                  onHide={onHideTask ? () => onHideTask(task.id) : undefined}
                  onClick={() => onTaskClick?.(task)}
                  teamMembers={teamMembers}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </CardContent>
    </Card>
  );
}

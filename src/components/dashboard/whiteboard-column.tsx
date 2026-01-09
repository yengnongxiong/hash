"use client";

import { WhiteboardTask } from "@/types/database";
import { WhiteboardTaskCard } from "./whiteboard-task";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droppable } from "@hello-pangea/dnd";

interface WhiteboardColumnProps {
  id: string;
  title: string;
  tasks: WhiteboardTask[];
  onDeleteTask: (taskId: string) => void;
  onTaskClick?: (task: WhiteboardTask) => void;
}

export function WhiteboardColumn({
  id,
  title,
  tasks,
  onDeleteTask,
  onTaskClick,
}: WhiteboardColumnProps) {
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
            </div>
          )}
        </Droppable>
      </CardContent>
    </Card>
  );
}

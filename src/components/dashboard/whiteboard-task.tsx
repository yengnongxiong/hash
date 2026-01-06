"use client";

import { WhiteboardTask } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";
import { formatDistanceToNow } from "@/lib/utils/format";

interface WhiteboardTaskCardProps {
  task: WhiteboardTask;
  index: number;
  onDelete: () => void;
}

export function WhiteboardTaskCard({
  task,
  index,
  onDelete,
}: WhiteboardTaskCardProps) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`cursor-grab active:cursor-grabbing group ${
            snapshot.isDragging ? "shadow-lg ring-2 ring-primary" : ""
          }`}
          style={{
            ...provided.draggableProps.style,
            backgroundColor: task.color !== "#ffffff" ? task.color : undefined,
          }}
        >
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{task.title}</p>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(task.created_at))}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}

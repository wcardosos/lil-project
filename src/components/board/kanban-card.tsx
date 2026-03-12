"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Minus, SignalHigh, SignalLow, SignalMedium } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Task, TaskPriority } from "@/lib/mock-data";

const priorityIcons: Record<TaskPriority, React.ReactNode> = {
  urgent: <SignalHigh className="h-3.5 w-3.5 text-red-500" />,
  high: <SignalHigh className="h-3.5 w-3.5 text-orange-500" />,
  medium: <SignalMedium className="h-3.5 w-3.5 text-yellow-500" />,
  low: <SignalLow className="h-3.5 w-3.5 text-blue-400" />,
  "no-priority": <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
};

interface KanbanCardProps {
  task: Task;
}

export function KanbanCard({ task }: KanbanCardProps) {
  const { setNodeRef, attributes, listeners, transform, isDragging } =
    useDraggable({ id: task.id });

  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Transform.toString(transform) }}
      className={`border border-border ring-0 transition-shadow hover:shadow-md ${
        isDragging ? "cursor-grabbing opacity-30" : "cursor-grab"
      }`}
    >
      <CardContent className="flex h-24 flex-col justify-between px-3 py-0">
        <div className="flex items-center gap-1.5">
          {priorityIcons[task.priority]}
          <span className="text-xs text-muted-foreground">
            {task.identifier}
          </span>
        </div>

        <p className="line-clamp-2 text-sm font-medium leading-snug">
          {task.title}
        </p>

        <div className="flex items-center justify-between gap-1">
          <div className="flex flex-wrap gap-1">
            {task.labels?.map((label) => (
              <Badge
                key={label}
                variant="secondary"
                className="px-1.5 py-0 text-xs"
              >
                {label}
              </Badge>
            ))}
          </div>

          {task.assignee ? (
            <Avatar className="h-5 w-5 shrink-0">
              <AvatarFallback className="text-[10px]">
                {task.assignee.initials}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="h-5 w-5 shrink-0" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { KanbanColumn as KanbanColumnType } from "@/lib/mock-data";
import { KanbanCard } from "./kanban-card";

interface KanbanColumnProps {
  column: KanbanColumnType;
}

export function KanbanColumn({ column }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col w-72 shrink-0 h-full">
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{column.title}</span>
          <Badge variant="secondary" className="text-xs h-5 px-1.5">
            {column.tasks.length}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div
          ref={setNodeRef}
          className={`flex flex-col gap-2 pr-2 min-h-full rounded transition-colors ${
            isOver ? "bg-accent/50" : ""
          }`}
        >
          {column.tasks.map((task) => (
            <KanbanCard key={task.id} task={task} />
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { KanbanColumn as KanbanColumnType } from "@/lib/mock-data";
import { KanbanColumn } from "./kanban-column";

interface KanbanBoardProps {
  columns: KanbanColumnType[];
}

export function KanbanBoard({ columns }: KanbanBoardProps) {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 p-4 pb-6">
        {columns.map((column) => (
          <KanbanColumn key={column.id} column={column} />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

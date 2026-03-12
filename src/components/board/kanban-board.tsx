"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { KanbanColumn as KanbanColumnType, Task } from "@/lib/mock-data";
import { KanbanCard } from "./kanban-card";
import { KanbanColumn } from "./kanban-column";

interface KanbanBoardProps {
  columns: KanbanColumnType[];
}

export function KanbanBoard({ columns }: KanbanBoardProps) {
  const [columnState, setColumnState] = useState<KanbanColumnType[]>(columns);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    const task = columnState
      .flatMap((col) => col.tasks)
      .find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);

    const { active, over } = event;
    if (!over) return;

    const sourceColumn = columnState.find((col) =>
      col.tasks.some((t) => t.id === active.id),
    );
    const destColumn = columnState.find((col) => col.id === over.id);

    if (!sourceColumn || !destColumn || sourceColumn.id === destColumn.id)
      return;

    const draggedTask = sourceColumn.tasks.find((t) => t.id === active.id)!;

    setColumnState((prev) =>
      prev.map((col) => {
        if (col.id === sourceColumn.id)
          return { ...col, tasks: col.tasks.filter((t) => t.id !== active.id) };
        if (col.id === destColumn.id)
          return { ...col, tasks: [...col.tasks, draggedTask] };
        return col;
      }),
    );
  }

  return (
    <DndContext
      id="kanban-board"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
    >
      <div className="flex-1 min-h-0 overflow-x-auto">
        <div className="flex h-full items-stretch gap-4 p-4 pb-6">
          {columnState.map((column) => (
            <KanbanColumn key={column.id} column={column} />
          ))}
        </div>
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="shadow-xl">
            <KanbanCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

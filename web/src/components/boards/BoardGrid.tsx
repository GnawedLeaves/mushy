"use client";

import { useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { reorderSaveInBoard } from "@/lib/actions/board-saves";
import { BoardSaveCard } from "@/components/boards/BoardSaveCard";
import type { SaveWithUrl } from "@/lib/types";

function SortableBoardCard({ boardId, save }: { boardId: string; save: SaveWithUrl }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: save.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={`group relative ${isDragging ? "opacity-70" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="absolute left-2 top-2 z-10 cursor-grab rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <BoardSaveCard boardId={boardId} save={save} />
    </div>
  );
}

export function BoardGrid({ boardId, saves, editable }: { boardId: string; saves: SaveWithUrl[]; editable: boolean }) {
  const [ordered, setOrdered] = useState(saves);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!editable) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {saves.map((save) => (
          <BoardSaveCard key={save.id} boardId={boardId} save={save} />
        ))}
      </div>
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ordered.findIndex((s) => s.id === active.id);
    const newIndex = ordered.findIndex((s) => s.id === over.id);
    const next = arrayMove(ordered, oldIndex, newIndex);
    setOrdered(next);

    const beforeId = next[newIndex - 1]?.id ?? null;
    const afterId = next[newIndex + 1]?.id ?? null;
    reorderSaveInBoard(boardId, String(active.id), beforeId, afterId);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ordered.map((s) => s.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {ordered.map((save) => (
            <SortableBoardCard key={save.id} boardId={boardId} save={save} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

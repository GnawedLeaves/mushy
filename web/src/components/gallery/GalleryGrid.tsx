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
import { reorderSave } from "@/lib/actions/saves";
import { SaveCard } from "@/components/gallery/SaveCard";
import type { BoardSummary, SaveWithUrl } from "@/lib/types";

function SortableSaveCard({ save, boards }: { save: SaveWithUrl; boards: BoardSummary[] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: save.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={isDragging ? "opacity-70" : undefined}
    >
      <div className="relative">
        <button
          {...attributes}
          {...listeners}
          className="absolute left-2 top-2 z-10 cursor-grab rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <SaveCard save={save} boards={boards} />
      </div>
    </div>
  );
}

// Manual drag-reorder view only -- needs the full ordered list loaded so
// dnd-kit has real neighbors to compute before/after against. The
// chronological feed uses InfiniteMasonryGrid instead, which paginates.
export function GalleryGrid({ saves, boards }: { saves: SaveWithUrl[]; boards: BoardSummary[] }) {
  const [orderedSaves, setOrderedSaves] = useState(saves);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedSaves.findIndex((s) => s.id === active.id);
    const newIndex = orderedSaves.findIndex((s) => s.id === over.id);
    const next = arrayMove(orderedSaves, oldIndex, newIndex);
    setOrderedSaves(next);

    const beforeId = next[newIndex - 1]?.id ?? null;
    const afterId = next[newIndex + 1]?.id ?? null;
    reorderSave(String(active.id), beforeId, afterId);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={orderedSaves.map((s) => s.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {orderedSaves.map((save) => (
            <div key={save.id} className="group">
              <SortableSaveCard save={save} boards={boards} />
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

"use client";

import { useEffect, useState } from "react";
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

function SortableBoardCard({
  boardId,
  save,
  onRemoved,
}: {
  boardId: string;
  save: SaveWithUrl;
  onRemoved: () => void;
}) {
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
      <BoardSaveCard boardId={boardId} save={save} onRemoved={onRemoved} />
    </div>
  );
}

export function BoardGrid({ boardId, saves, editable }: { boardId: string; saves: SaveWithUrl[]; editable: boolean }) {
  const [ordered, setOrdered] = useState(saves);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // `useState(saves)` only reads its initial value once, on mount -- it
  // doesn't automatically resync when this component gets a new `saves`
  // prop from a later server render (e.g. after AddSavesDialog's
  // revalidatePath brings back a longer list, or after navigating away and
  // back to a board a save was removed from elsewhere). Without this, an
  // added save didn't show until a hard reload force-remounted the whole
  // component, and a board could look empty/stale on return even though
  // the server's data was already correct.
  useEffect(() => {
    // Deferred a tick so this isn't a setState called directly inside the
    // effect body (react-hooks/set-state-in-effect) -- same pattern as
    // lib/useSectionPath.ts.
    queueMicrotask(() => setOrdered(saves));
  }, [saves]);

  function handleRemoved(saveId: string) {
    setOrdered((prev) => prev.filter((s) => s.id !== saveId));
  }

  if (!editable) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {saves.map((save) => (
          <BoardSaveCard key={save.id} boardId={boardId} save={save} canRemove={false} />
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
    // A static `id` sidesteps a real SSR hydration mismatch: dnd-kit's
    // default auto-generated id is a module-level counter that keeps
    // incrementing across every DndContext mounted so far in the client
    // session (e.g. visiting the gallery's "My order" view first), while
    // each server render starts that counter fresh at 0 -- so the
    // aria-describedby id it renders can legitimately differ next time.
    <DndContext id={`board-${boardId}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ordered.map((s) => s.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {ordered.map((save) => (
            <SortableBoardCard
              key={save.id}
              boardId={boardId}
              save={save}
              onRemoved={() => handleRemoved(save.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

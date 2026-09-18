"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { addSaveToBoard } from "@/lib/actions/board-saves";
import type { SaveWithUrl } from "@/lib/types";

export function AddSavesDialog({ boardId, availableSaves }: { boardId: string; availableSaves: SaveWithUrl[] }) {
  const [open, setOpen] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  function handleAdd(saveId: string) {
    setAddedIds((prev) => new Set(prev).add(saveId));
    addSaveToBoard(boardId, saveId).catch(() => {
      toast.error("Could not add save.");
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(saveId);
        return next;
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Plus className="mr-1 h-4 w-4" />
        Add saves
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add saves to this board</DialogTitle>
        </DialogHeader>
        {availableSaves.length === 0 ? (
          <p className="text-sm text-muted-foreground">Every save is already on this board.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {availableSaves.map((save) => {
              const added = addedIds.has(save.id);
              return (
                <button
                  key={save.id}
                  onClick={() => !added && handleAdd(save.id)}
                  className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
                  disabled={added}
                >
                  {save.mediaUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={save.mediaUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                  <div
                    className={`absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white transition-opacity ${
                      added ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {added ? "Added" : "Add"}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

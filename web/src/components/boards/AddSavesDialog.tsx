"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { addSavesToBoard, loadMoreAvailableSaves, type AvailableSavesCursor } from "@/lib/actions/board-saves";
import type { SaveWithUrl } from "@/lib/types";

const ADD_DEBOUNCE_MS = 400;

export function AddSavesDialog({
  boardId,
  availableSaves,
  initialCursor,
}: {
  boardId: string;
  availableSaves: SaveWithUrl[];
  initialCursor: AvailableSavesCursor | null;
}) {
  const [open, setOpen] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  // Snapshotted once per open rather than tracked live: each debounced
  // flush below calls revalidatePath, which re-runs the board page and
  // sends this component a shorter `availableSaves` (now missing whatever
  // just landed on the board). Following that prop live while the dialog
  // is open made the grid reshuffle and drop the "Added" state mid-tap --
  // tapping several images in a row on mobile was what triggered it most,
  // since a flush from an earlier tap could land while later ones were
  // still queued. "Load more" below appends to this same local list rather
  // than depending on fresh props too.
  const [savesSnapshot, setSavesSnapshot] = useState(availableSaves);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const pendingRef = useRef<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      // Closing (or navigating away) shouldn't drop a still-debounced tap
      // -- flush whatever's pending right away instead of waiting out the
      // timeout on a dialog that's no longer visible.
      if (debounceRef.current) clearTimeout(debounceRef.current);
      flush();
      return;
    }
    // Deferred a tick so this isn't a setState called directly inside the
    // effect body (react-hooks/set-state-in-effect) -- same pattern as
    // lib/useSectionPath.ts.
    queueMicrotask(() => {
      setSavesSnapshot(availableSaves);
      setCursor(initialCursor);
      setAddedIds(new Set());
    });
    pendingRef.current = new Set();
    // Intentionally only re-syncs when the dialog transitions open, not on
    // every `availableSaves`/`initialCursor` change -- see the comment on
    // savesSnapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleLoadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const page = await loadMoreAvailableSaves(boardId, cursor);
    setSavesSnapshot((prev) => [...prev, ...page.saves]);
    setCursor(page.nextCursor);
    setLoadingMore(false);
  }

  function flush() {
    const ids = Array.from(pendingRef.current);
    pendingRef.current = new Set();
    if (ids.length === 0) return;
    addSavesToBoard(boardId, ids).catch(() => {
      toast.error("Could not add some saves.");
      setAddedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    });
  }

  function handleAdd(saveId: string) {
    setAddedIds((prev) => new Set(prev).add(saveId));
    pendingRef.current.add(saveId);
    // Batches a burst of taps into one Server Action call instead of one
    // per tap -- see addSavesToBoard's comment for why that mattered.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(flush, ADD_DEBOUNCE_MS);
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
        {savesSnapshot.length === 0 ? (
          <p className="text-sm text-muted-foreground">Every save is already on this board.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {savesSnapshot.map((save) => {
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
        {cursor && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

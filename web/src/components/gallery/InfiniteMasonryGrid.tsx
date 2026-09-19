"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { loadMoreSaves, type GalleryCursor } from "@/lib/actions/gallery";
import { SaveCard } from "@/components/gallery/SaveCard";
import type { BoardSummary, SaveWithUrl } from "@/lib/types";

export function InfiniteMasonryGrid({
  initialSaves,
  initialCursor,
  boards,
}: {
  initialSaves: SaveWithUrl[];
  initialCursor: GalleryCursor | null;
  boards: BoardSummary[];
}) {
  const [saves, setSaves] = useState(initialSaves);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  function handleDeleted(saveId: string) {
    setSaves((prev) => prev.filter((s) => s.id !== saveId));
  }

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !cursor) return;
    loadingRef.current = true;
    setLoading(true);
    const page = await loadMoreSaves(cursor);
    setSaves((prev) => [...prev, ...page.saves]);
    setCursor(page.nextCursor);
    setLoading(false);
    loadingRef.current = false;
  }, [cursor]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "800px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div>
      <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
        <AnimatePresence>
          {saves.map((save) => (
            <SaveCard key={save.id} save={save} boards={boards} onDeleted={handleDeleted} />
          ))}
        </AnimatePresence>
      </div>

      {cursor && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
      )}
    </div>
  );
}

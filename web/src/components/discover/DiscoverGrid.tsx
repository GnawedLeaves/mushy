"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { loadMoreDiscoverSaves, type DiscoverCursor, type DiscoverSave } from "@/lib/actions/discover";
import { DiscoverCard } from "@/components/discover/DiscoverCard";

export function DiscoverGrid({
  initialSaves,
  initialCursor,
}: {
  initialSaves: DiscoverSave[];
  initialCursor: DiscoverCursor | null;
}) {
  const [saves, setSaves] = useState(initialSaves);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !cursor) return;
    loadingRef.current = true;
    setLoading(true);
    const page = await loadMoreDiscoverSaves(cursor);
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
        {saves.map((save) => (
          <DiscoverCard key={save.id} save={save} />
        ))}
      </div>

      {cursor && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
      )}
    </div>
  );
}

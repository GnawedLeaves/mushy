"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadDomeGalleryPage, suggestDiscoverTags, type DomeGalleryItem } from "@/lib/actions/discover";
import { TagFilterInput } from "@/components/tags/TagFilterInput";
import DomeGallery from "@/components/discover/DomeGallery";

type SortMode = "recency" | "popularity";

// Desktop-only presentation of Discover (see discover/page.tsx -- mobile
// keeps the existing masonry DiscoverGrid). Dome Gallery itself is a fixed
// pool of tiles with no pagination, sort, or filter of its own -- all of
// that lives here, feeding the component a growing `items` array as the
// viewer asks for more. Tags are OR'd (see loadDomeGalleryPage).
export function DomeGalleryDiscover() {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortMode>("recency");
  const [items, setItems] = useState<DomeGalleryItem[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  // Any filter/sort change starts the pool over from scratch -- merging a
  // re-sorted or re-filtered page into an existing pool doesn't make sense
  // (the dome would show a mix of two different queries' results). The
  // "loading" flag itself is set from the handlers that change tags/sort
  // below, not directly in this effect body -- react-hooks/set-state-in-effect
  // wants an effect to only subscribe/schedule, not assign state on run.
  useEffect(() => {
    let cancelled = false;
    const requestId = ++requestIdRef.current;
    loadDomeGalleryPage(0, tags, sort).then((page) => {
      if (cancelled || requestId !== requestIdRef.current) return;
      setItems(page.items);
      setNextOffset(page.nextOffset);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [tags, sort]);

  function handleTagsChange(next: string[]) {
    setLoading(true);
    setTags(next);
  }

  function handleSortChange(next: SortMode) {
    if (next === sort) return;
    setLoading(true);
    setSort(next);
  }

  async function loadMore() {
    if (nextOffset === null || loading) return;
    setLoading(true);
    const page = await loadDomeGalleryPage(nextOffset, tags, sort);
    setItems((prev) => [...prev, ...page.items]);
    setNextOffset(page.nextOffset);
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TagFilterInput
          tags={tags}
          onChange={handleTagsChange}
          suggest={suggestDiscoverTags}
          placeholder="Filter by tag (e.g. y2k)..."
          className="w-full sm:w-80"
        />

        <div className="flex gap-1 rounded-md border p-1 text-sm">
          <button
            type="button"
            onClick={() => handleSortChange("recency")}
            className={cn("rounded px-2 py-1", sort === "recency" && "bg-muted font-medium")}
          >
            Recent
          </button>
          <button
            type="button"
            onClick={() => handleSortChange("popularity")}
            className={cn("rounded px-2 py-1", sort === "popularity" && "bg-muted font-medium")}
          >
            Popular
          </button>
        </div>
      </div>

      <div className="relative h-[70vh] w-full overflow-hidden rounded-2xl border">
        {items.length === 0 && !loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {tags.length > 0 ? "Nothing matches those tags yet." : "Nothing to discover yet."}
          </div>
        ) : (
          <DomeGallery
            images={items}
            fit={0.6}
            grayscale={false}
            onOpenSave={(id) => router.push(`/s/${id}`)}
          />
        )}

        {loading && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading...
            </div>
          </div>
        )}
      </div>

      {nextOffset !== null && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-md border px-4 py-1.5 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

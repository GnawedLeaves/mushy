"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  loadMoreDiscoverSaves,
  searchSavesByTags,
  suggestDiscoverTags,
  type DiscoverCursor,
  type DiscoverSave,
} from "@/lib/actions/discover";
import { DiscoverCard } from "@/components/discover/DiscoverCard";
import { TagFilterInput } from "@/components/tags/TagFilterInput";

const SEARCH_DEBOUNCE_MS = 400;

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

  // Tag search is a separate mode -- it's a filter over a hidden field
  // (Discover never renders tags themselves), not paginated the way the
  // normal browse feed is, so it swaps the grid's contents rather than
  // extending them. Multiple tags are OR'd (see searchSavesByTags).
  const [tags, setTags] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<DiscoverSave[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  function handleTagsChange(next: string[]) {
    setTags(next);
    if (next.length === 0) {
      setSearchResults(null);
      setSearching(false);
    } else {
      setSearching(true);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (tags.length === 0) return;
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      const results = await searchSavesByTags(tags);
      if (requestId === requestIdRef.current) {
        setSearchResults(results);
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [tags]);

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
    if (!sentinel || searchResults !== null) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "800px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, searchResults]);

  const isSearchMode = tags.length > 0;
  const visibleSaves = isSearchMode ? (searchResults ?? []) : saves;

  return (
    <div className="space-y-4">
      <TagFilterInput
        tags={tags}
        onChange={handleTagsChange}
        suggest={suggestDiscoverTags}
        placeholder="Search by look (e.g. y2k, minimalist)..."
        className="max-w-md"
      />

      {isSearchMode && searching && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {isSearchMode && !searching && visibleSaves.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Nothing matches those looks yet.</p>
      )}

      {(!isSearchMode || (!searching && visibleSaves.length > 0)) && (
        <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
          {visibleSaves.map((save) => (
            <DiscoverCard key={save.id} save={save} showTags={isSearchMode} />
          ))}
        </div>
      )}

      {!isSearchMode && cursor && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
      )}
    </div>
  );
}

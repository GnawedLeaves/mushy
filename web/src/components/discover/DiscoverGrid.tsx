"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import {
  loadMoreDiscoverSaves,
  searchSavesByTag,
  type DiscoverCursor,
  type DiscoverSave,
} from "@/lib/actions/discover";
import { DiscoverCard } from "@/components/discover/DiscoverCard";
import { Input } from "@/components/ui/input";

const SEARCH_DEBOUNCE_MS = 500;

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
  // extending them.
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DiscoverSave[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  function handleQueryChange(value: string) {
    setQuery(value);
    // Mirrors UserSearch's handleChange: the <1-char reset is done here, in
    // the input's own change handler, not in the effect below -- setting
    // state synchronously inside an effect body trips react-hooks rules,
    // while doing it here (a normal event handler) is the expected case.
    if (!value.trim()) {
      setSearchResults(null);
      setSearching(false);
    } else {
      setSearching(true);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) return;
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      const results = await searchSavesByTag(trimmed);
      if (requestId === requestIdRef.current) {
        setSearchResults(results);
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

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

  const isSearchMode = query.trim().length > 0;
  const visibleSaves = isSearchMode ? (searchResults ?? []) : saves;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search by look (e.g. y2k, minimalist)..."
          className="pl-8 pr-8"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => handleQueryChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isSearchMode && searching && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {isSearchMode && !searching && visibleSaves.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Nothing matches that look yet.</p>
      )}

      {(!isSearchMode || (!searching && visibleSaves.length > 0)) && (
        <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
          {visibleSaves.map((save) => (
            <DiscoverCard key={save.id} save={save} />
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

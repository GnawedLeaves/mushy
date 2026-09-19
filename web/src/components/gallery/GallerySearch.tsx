"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { searchMySavesByTags, suggestMyTags } from "@/lib/actions/gallery";
import { SaveCard } from "@/components/gallery/SaveCard";
import { TagFilterInput } from "@/components/tags/TagFilterInput";
import type { BoardSummary, SaveWithUrl } from "@/lib/types";

const DEBOUNCE_MS = 400;

// Wraps the normal gallery content: while a tag search is active, the
// search results replace `children` entirely (rather than sitting
// alongside them) so the viewer isn't looking at two different result sets
// -- the full unfiltered feed/manual-order grid and a filtered list -- at
// the same time. Multiple tags are OR'd (see searchMySavesByTags).
export function GallerySearch({ boards, children }: { boards: BoardSummary[]; children: ReactNode }) {
  const [tags, setTags] = useState<string[]>([]);
  const [results, setResults] = useState<SaveWithUrl[] | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  function handleTagsChange(next: string[]) {
    setTags(next);
    if (next.length === 0) {
      setResults(null);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (tags.length === 0) return;
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      const data = await searchMySavesByTags(tags);
      if (requestId === requestIdRef.current) {
        setResults(data);
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [tags]);

  const active = tags.length > 0;

  return (
    <div className="space-y-4">
      <TagFilterInput
        tags={tags}
        onChange={handleTagsChange}
        suggest={suggestMyTags}
        placeholder="Filter your saves by tag..."
        className="max-w-md"
      />

      {active ? (
        <div>
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && results && results.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No saves with any of those tags yet.</p>
          )}
          {!loading && results && results.length > 0 && (
            <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
              {results.map((save) => (
                <SaveCard key={save.id} save={save} boards={boards} />
              ))}
            </div>
          )}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

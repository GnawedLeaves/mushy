"use client";

import { useState } from "react";
import { LayoutGrid, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import { DiscoverGrid } from "@/components/discover/DiscoverGrid";
import { DomeGalleryDiscover } from "@/components/discover/DomeGalleryDiscover";
import type { DiscoverCursor, DiscoverSave } from "@/lib/actions/discover";

type ViewMode = "dome" | "cards";

// Desktop-only choice between the two Discover presentations -- the dome is
// the showcase view, but dragging to rotate it isn't to everyone's taste
// (or every trackpad's), so the existing masonry grid stays one click away
// instead of being mobile-exclusive.
export function DiscoverViewSwitcher({
  initialSaves,
  initialCursor,
}: {
  initialSaves: DiscoverSave[];
  initialCursor: DiscoverCursor | null;
}) {
  const [view, setView] = useState<ViewMode>("dome");

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="flex gap-1 rounded-md border p-1 text-sm">
          <button
            type="button"
            onClick={() => setView("dome")}
            aria-label="Dome view"
            className={cn(
              "flex items-center gap-1.5 rounded px-2 py-1",
              view === "dome" && "bg-muted font-medium"
            )}
          >
            <CircleDot className="h-4 w-4" />
            Dome
          </button>
          <button
            type="button"
            onClick={() => setView("cards")}
            aria-label="Card view"
            className={cn(
              "flex items-center gap-1.5 rounded px-2 py-1",
              view === "cards" && "bg-muted font-medium"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Cards
          </button>
        </div>
      </div>

      {view === "dome" ? (
        <DomeGalleryDiscover />
      ) : (
        <DiscoverGrid initialSaves={initialSaves} initialCursor={initialCursor} />
      )}
    </div>
  );
}

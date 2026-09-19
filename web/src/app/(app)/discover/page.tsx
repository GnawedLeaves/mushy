import { DiscoverGrid } from "@/components/discover/DiscoverGrid";
import { DiscoverViewSwitcher } from "@/components/discover/DiscoverViewSwitcher";
import { PullToRefresh } from "@/components/fx/PullToRefresh";
import { loadMoreDiscoverSaves } from "@/lib/actions/discover";
import { Compass } from "lucide-react";

export default async function DiscoverPage() {
  const firstPage = await loadMoreDiscoverSaves(null);

  return (
    <PullToRefresh>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Discover</h1>

        {/* Desktop: a switcher between reactbits' Dome Gallery (default) and
            the same masonry grid mobile uses, since dragging to rotate a 3D
            dome isn't for everyone. Mobile always gets the masonry grid
            directly, no switcher -- dragging to rotate the dome doesn't
            translate to touch scrolling. Cutoff is `md` (768px), not `lg`
            (1024px) -- `lg` meant a lot of ordinary laptop-width browser
            windows (not just narrow/tablet ones) fell back to the mobile grid
            and never saw the dome at all. */}
        <div className="hidden md:block">
          <DiscoverViewSwitcher initialSaves={firstPage.saves} initialCursor={firstPage.nextCursor} />
        </div>

        <div className="md:hidden">
          {firstPage.saves.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-24 text-center text-muted-foreground">
              <Compass className="h-6 w-6" />
              <p className="max-w-sm text-sm">
                Nothing to discover yet -- once other people save things publicly, they&apos;ll show up here.
              </p>
            </div>
          ) : (
            <DiscoverGrid initialSaves={firstPage.saves} initialCursor={firstPage.nextCursor} />
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}

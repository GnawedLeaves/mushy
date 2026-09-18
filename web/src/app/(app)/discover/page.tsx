import { Compass } from "lucide-react";
import { loadMoreDiscoverSaves } from "@/lib/actions/discover";
import { DiscoverGrid } from "@/components/discover/DiscoverGrid";

export default async function DiscoverPage() {
  const firstPage = await loadMoreDiscoverSaves(null);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Discover</h1>

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
  );
}

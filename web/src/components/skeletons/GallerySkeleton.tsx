import { Skeleton } from "@/components/ui/skeleton";

// Varying heights so the masonry skeleton doesn't look like a rigid grid --
// mirrors the real masonry layout's uneven card heights.
const HEIGHTS = [220, 160, 280, 190, 240, 170, 260, 200];

export function GallerySkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="mb-4 break-inside-avoid overflow-hidden rounded-lg border bg-card">
          <Skeleton className="w-full rounded-none" style={{ height: HEIGHTS[i % HEIGHTS.length] }} />
          <div className="p-2">
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

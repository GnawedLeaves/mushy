import { Skeleton } from "@/components/ui/skeleton";
import { GallerySkeleton } from "@/components/skeletons/GallerySkeleton";

// Fallback for the (app) segment generally -- Next.js's file-based loading
// UI convention: this renders automatically (wrapped in its own Suspense
// boundary) the instant a navigation to any (app) route starts, replacing
// only the route content below the persisting nav, no manual
// isLoading/useTransition wiring needed. More specific loading.tsx files in
// subfolders (boards/, discover/, etc.) take over for those routes instead.
export default function AppLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-8 w-32" />
      </div>
      <GallerySkeleton />
    </div>
  );
}

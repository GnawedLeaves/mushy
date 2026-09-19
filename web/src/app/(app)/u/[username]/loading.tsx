import { Skeleton } from "@/components/ui/skeleton";
import { GallerySkeleton } from "@/components/skeletons/GallerySkeleton";

export default function ProfileLoading() {
  return (
    <div>
      {/* Mirrors the real page's back button (page.tsx). */}
      <Skeleton className="mb-4 h-9 w-9 rounded-full" />
      <div className="mb-10 flex items-start gap-4 rounded-2xl border bg-card/80 p-6 shadow-sm backdrop-blur-md">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="mb-3 h-4 w-16" />
      <GallerySkeleton />
    </div>
  );
}

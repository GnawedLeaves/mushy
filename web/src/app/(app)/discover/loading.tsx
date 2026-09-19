import { Skeleton } from "@/components/ui/skeleton";
import { GallerySkeleton } from "@/components/skeletons/GallerySkeleton";

export default function DiscoverLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-32" />
      <GallerySkeleton />
    </div>
  );
}

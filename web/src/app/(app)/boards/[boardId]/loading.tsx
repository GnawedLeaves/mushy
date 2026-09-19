import { Skeleton } from "@/components/ui/skeleton";
import { BoardsSkeleton } from "@/components/skeletons/BoardsSkeleton";

export default function BoardDetailLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-40" />
      </div>
      <BoardsSkeleton count={6} />
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { BoardsSkeleton } from "@/components/skeletons/BoardsSkeleton";

export default function BoardsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-8 w-28" />
      </div>
      <BoardsSkeleton />
    </div>
  );
}

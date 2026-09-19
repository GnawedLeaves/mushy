import { Skeleton } from "@/components/ui/skeleton";
import { BoardsSkeleton } from "@/components/skeletons/BoardsSkeleton";

export default function BoardDetailLoading() {
  return (
    <div className="space-y-4">
      {/* Mirrors the real page's header shape (page.tsx): a back button next
          to the title/description, wrapping alongside the owner actions on
          narrow screens -- kept in sync so there's no layout jump when the
          real content swaps in. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Skeleton className="mt-0.5 h-9 w-9 shrink-0 rounded-full" />
          <div>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-8 w-40" />
      </div>
      <BoardsSkeleton count={6} />
    </div>
  );
}

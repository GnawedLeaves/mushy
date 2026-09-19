import { Skeleton } from "@/components/ui/skeleton";

export default function SaveDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Mirrors the real page's back button + owner menu row (page.tsx). */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <Skeleton className="h-[60vh] w-full rounded-none" />
        <div className="space-y-4 p-5">
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

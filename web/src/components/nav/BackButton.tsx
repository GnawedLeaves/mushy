"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// router.back() rather than a fixed href -- these detail pages (a save, a
// board, a profile) are reached from several different places (Gallery,
// Discover, a board, search, a notification), so there's no single "back to
// X" that's right every time; unwinding whatever the visitor's own history
// actually is gets them back to where they came from.
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Back"
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border bg-card/80 text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:text-foreground",
        className
      )}
    >
      <ArrowLeft className="h-4.5 w-4.5" />
    </button>
  );
}

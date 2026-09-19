"use client";

import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowDown } from "lucide-react";

const PULL_THRESHOLD = 64;
const MAX_PULL = 96;
const PULL_RESISTANCE = 0.5;

// Touch-only (no mouse handling) -- pulling to refresh is a mobile gesture,
// and gating on touch events means this simply never activates on desktop
// rather than needing a separate breakpoint check.
export function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const trackingRef = useRef(false);

  function handleTouchStart(e: TouchEvent) {
    if (refreshing || window.scrollY > 0) return;
    startYRef.current = e.touches[0]!.clientY;
    trackingRef.current = true;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!trackingRef.current || startYRef.current === null) return;
    const delta = e.touches[0]!.clientY - startYRef.current;
    // Bail the moment either condition stops holding, rather than only
    // checking at touchstart -- a page can scroll out from under an
    // in-progress pull (e.g. content above loads in), and a pull that
    // started as a downward drag can reverse mid-gesture.
    if (delta <= 0 || window.scrollY > 0) {
      trackingRef.current = false;
      setPullDistance(0);
      return;
    }
    setPullDistance(Math.min(delta * PULL_RESISTANCE, MAX_PULL));
  }

  async function handleTouchEnd() {
    if (!trackingRef.current) return;
    trackingRef.current = false;
    startYRef.current = null;

    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      router.refresh();
      // router.refresh() doesn't return a promise tied to the new data
      // actually landing -- a short fixed delay keeps the spinner from just
      // flashing while the refetch is still in flight.
      await new Promise((resolve) => setTimeout(resolve, 600));
      setRefreshing(false);
      setPullDistance(0);
    } else {
      setPullDistance(0);
    }
  }

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div
        className="flex items-end justify-center overflow-hidden transition-[height] duration-150 sm:hidden"
        style={{ height: pullDistance }}
      >
        {pullDistance > 0 && (
          <div className="pb-2 text-muted-foreground">
            {refreshing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowDown
                className="h-5 w-5 transition-transform"
                style={{ transform: `rotate(${Math.min(pullDistance / PULL_THRESHOLD, 1) * 180}deg)` }}
              />
            )}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

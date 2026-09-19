"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Keyed by pathname so switching tabs in the nav (or any route change)
// crossfades/slides the outgoing page out and the new one in, instead of
// the instant swap Next's App Router does by default.
//
// `mode="popLayout"`, not the more obvious `mode="wait"`: "wait" holds the
// incoming page (including its own loading.tsx Suspense fallback) unmounted
// until the outgoing page's ~200ms exit animation fully finishes -- which
// meant every route's loading skeleton was invisible for that whole
// window, and on a fast-resolving page the real content could finish
// loading before the skeleton was ever given a chance to mount at all, so
// a fast navigation looked like it had no skeleton whatsoever. "popLayout"
// takes the exiting page out of normal layout flow (position: absolute)
// so the incoming page -- skeleton included -- mounts and starts
// animating in immediately, overlapping the old page's fade-out instead of
// waiting on it.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

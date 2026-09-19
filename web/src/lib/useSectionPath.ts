"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "mushy:lastSection";

// A save-detail page (/s/[id]) isn't a nav destination of its own -- it can
// be reached from Gallery, Discover, a board, or a profile, and none of
// those hrefs prefix-match /s/..., so the nav has nothing to highlight there
// by default. Remember whichever top-level section the visitor was last on
// and keep highlighting that while viewing a save's detail page.
export function useSectionPath(): string {
  const pathname = usePathname();
  const [remembered, setRemembered] = useState<string | null>(null);

  useEffect(() => {
    if (pathname.startsWith("/s/")) {
      // Deferred a tick so this isn't a setState called directly inside the
      // effect body (react-hooks/set-state-in-effect) -- the read itself is
      // still synchronous, just scheduled through a microtask callback.
      queueMicrotask(() => {
        try {
          setRemembered(sessionStorage.getItem(STORAGE_KEY));
        } catch {
          setRemembered(null);
        }
      });
    } else {
      try {
        sessionStorage.setItem(STORAGE_KEY, pathname);
      } catch {
        // Private browsing or storage disabled -- highlighting just falls
        // back to the real pathname, same as before this existed.
      }
    }
  }, [pathname]);

  return pathname.startsWith("/s/") ? (remembered ?? pathname) : pathname;
}

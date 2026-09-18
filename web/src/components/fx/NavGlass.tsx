"use client";

import { useEffect, type RefObject } from "react";
import LiquidGlassCore from "vitrio";

// The published vitrio version (0.1.2) doesn't yet expose the `attachTo`
// anchor-follow option that its own README documents (checked against
// node_modules/vitrio/src/vitrio.ts -- LiquidGlassOptions has no
// attachTo/attachPadding field, and vitrio/react's <LiquidGlass> wrapper
// doesn't wire one either). So this drives the core class directly and
// tracks the header's rect by hand via ResizeObserver + a resize listener.
//
// It refracts `contentRef` (real DOM -- cards/images/text, which
// `cloneNode` preserves) rather than a canvas: a cloned <canvas> comes back
// blank, which is why this isn't used over the ShaderGradient background.
export function NavGlass({
  headerRef,
  contentRef,
}: {
  headerRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    const header = headerRef.current;
    if (!header || typeof ResizeObserver === "undefined") return;

    const rect = header.getBoundingClientRect();
    const glass = new LiquidGlassCore({
      background: contentRef.current,
      width: rect.width,
      height: rect.height,
      x: rect.left,
      y: rect.top,
      radius: 0,
      scale: 20,
      chroma: 0.04,
      blur: 10,
      tint: 0.3,
      tintColor: "#ffffff",
      zIndex: 5,
      draggable: false,
    });

    const sync = () => {
      const r = header.getBoundingClientRect();
      glass.set({ width: r.width, height: r.height });
      glass.moveTo(r.left, r.top);
    };

    const resizeObserver = new ResizeObserver(sync);
    resizeObserver.observe(header);
    window.addEventListener("resize", sync);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", sync);
      glass.destroy();
    };
  }, [headerRef, contentRef]);

  return null;
}

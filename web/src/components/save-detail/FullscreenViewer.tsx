"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

export function FullscreenViewer({
  mediaUrl,
  mediaType,
  alt,
}: {
  mediaUrl: string;
  mediaType: "image" | "gif" | "video";
  alt: string;
}) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  function reset() {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }

  function close() {
    setOpen(false);
    reset();
  }

  function clampScale(next: number) {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
  }

  function zoomBy(delta: number) {
    setScale((s) => {
      const next = clampScale(s + delta);
      if (next === MIN_SCALE) setPos({ x: 0, y: 0 });
      return next;
    });
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    zoomBy(-e.deltaY * 0.002);
  }

  function handleDoubleClick() {
    setScale((s) => {
      if (s > MIN_SCALE) {
        setPos({ x: 0, y: 0 });
        return MIN_SCALE;
      }
      return 2.5;
    });
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (scale <= MIN_SCALE) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    setIsDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPos({ x: dragState.current.origX + dx, y: dragState.current.origY + dy });
  }

  function handlePointerUp() {
    dragState.current = null;
    setIsDragging(false);
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Maximize2 className="h-4 w-4" />
        Expand
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={close}>
          <div
            className="absolute right-4 top-4 z-10 flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button size="icon" variant="secondary" onClick={() => zoomBy(-0.5)} disabled={scale <= MIN_SCALE}>
              <Minus className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="secondary" onClick={() => zoomBy(0.5)} disabled={scale >= MAX_SCALE}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="secondary" onClick={close}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div
            className="flex h-full w-full items-center justify-center overflow-hidden"
            onWheel={handleWheel}
            onClick={(e) => e.stopPropagation()}
          >
            {mediaType === "video" ? (
              <video
                src={mediaUrl}
                controls
                autoPlay
                loop
                className="max-h-full max-w-full"
                style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl}
                alt={alt}
                draggable={false}
                onDoubleClick={handleDoubleClick}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="max-h-full max-w-full select-none"
                style={{
                  transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                  cursor: scale > MIN_SCALE ? "grab" : "zoom-in",
                  transition: isDragging ? "none" : "transform 0.1s ease-out",
                }}
              />
            )}
          </div>

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/60">
            Scroll or use +/- to zoom -- drag to pan -- double-click to reset -- Esc to close
          </p>
        </div>
      )}
    </>
  );
}

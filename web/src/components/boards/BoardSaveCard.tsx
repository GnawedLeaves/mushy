"use client";

import { useTransition } from "react";
import { motion } from "framer-motion";
import { ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { removeSaveFromBoard } from "@/lib/actions/board-saves";
import type { SaveWithUrl } from "@/lib/types";

export function BoardSaveCard({ boardId, save }: { boardId: string; save: SaveWithUrl }) {
  const [pending, startTransition] = useTransition();

  function handleRemove() {
    startTransition(async () => {
      try {
        await removeSaveFromBoard(boardId, save.id);
      } catch {
        toast.error("Could not remove from board.");
      }
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: pending ? 0.6 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.18 }}
      className="group relative overflow-hidden rounded-lg border bg-card"
    >
      <div className="relative aspect-square bg-muted">
        {save.mediaUrl &&
          (save.media_type === "video" ? (
            <video src={save.mediaUrl} className="h-full w-full object-cover" muted loop playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={save.mediaUrl} alt={save.caption ?? ""} className="h-full w-full object-cover" loading="lazy" />
          ))}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <a
            href={save.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur hover:bg-black/80"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
          <Button
            size="icon"
            variant="secondary"
            className="h-7 w-7 bg-black/60 text-white hover:bg-black/80"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {save.caption && <p className="truncate p-2 text-sm text-muted-foreground">{save.caption}</p>}
    </motion.div>
  );
}

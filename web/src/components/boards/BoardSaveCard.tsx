"use client";

import { useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { removeSaveFromBoard } from "@/lib/actions/board-saves";
import { MediaThumb } from "@/components/gallery/MediaThumb";
import type { SaveWithUrl } from "@/lib/types";

export function BoardSaveCard({
  boardId,
  save,
  canRemove = true,
  onRemoved,
}: {
  boardId: string;
  save: SaveWithUrl;
  canRemove?: boolean;
  onRemoved?: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleRemove() {
    // Optimistic: the parent grid drops this card from its list immediately
    // rather than waiting on a router refresh, which a Client Component's
    // own local state doesn't pick up on its own.
    onRemoved?.();
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
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: pending ? 0.6 : 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className="group relative overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-square bg-muted">
        <Link href={`/s/${save.id}`}>
          <MediaThumb
            mediaUrl={save.mediaUrl}
            mediaType={save.media_type}
            alt={save.caption ?? ""}
            className="h-full w-full object-cover"
          />
        </Link>

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <a
            href={save.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur hover:bg-black/80"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
          {canRemove && (
            <Button
              size="icon"
              variant="secondary"
              className="h-7 w-7 bg-black/60 text-white hover:bg-black/80"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      {save.caption && <p className="truncate p-2 text-sm text-muted-foreground">{save.caption}</p>}
    </motion.div>
  );
}

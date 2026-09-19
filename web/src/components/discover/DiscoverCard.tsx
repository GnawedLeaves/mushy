"use client";

import { MediaThumb } from "@/components/gallery/MediaThumb";
import { Button } from "@/components/ui/button";
import type { DiscoverSave } from "@/lib/actions/discover";
import { repinSave } from "@/lib/actions/discover";
import { motion } from "framer-motion";
import { Check, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export function DiscoverCard({ save, showTags = false }: { save: DiscoverSave; showTags?: boolean }) {
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await repinSave(save.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        setSaved(true);
        toast.success("Saved to your gallery");
      }
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative mb-4 break-inside-avoid overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-lg"
    >
      <Link href={`/s/${save.id}`}>
        <MediaThumb
          mediaUrl={save.mediaUrl}
          mediaType={save.media_type}
          alt={save.caption ?? "Discovered design"}
          width={save.width}
          height={save.height}
        />
      </Link>

      {/* Always visible on mobile -- see SaveCard's comment on the same
          pattern for why opacity-0 + group-hover alone hid this on touch. */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        <a
          href={save.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur hover:bg-black/80"
        >
          <ExternalLink className="h-3 w-3" />
          Source
        </a>
        <Button
          size="icon"
          variant="secondary"
          disabled={pending || saved}
          onClick={handleSave}
          className="h-7 w-7 bg-black/60 text-white hover:bg-black/80"
        >
          {saved ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2 p-2">
        <Link
          href={`/u/${save.owner.username}`}
          className="truncate text-xs text-muted-foreground hover:text-foreground"
        >
          {save.owner.display_name || `@${save.owner.username}`}
        </Link>
      </div>

      {showTags && save.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 pb-2">
          {save.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

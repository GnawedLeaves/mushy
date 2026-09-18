"use client";

import { motion } from "framer-motion";
import { MediaThumb } from "@/components/gallery/MediaThumb";
import type { SaveWithUrl } from "@/lib/types";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

export function PublicProfileGrid({ saves }: { saves: SaveWithUrl[] }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="columns-2 gap-4 sm:columns-3 lg:columns-4"
    >
      {saves.map((save) => (
        <motion.div
          key={save.id}
          variants={item}
          className="mb-4 break-inside-avoid overflow-hidden rounded-lg border bg-card shadow-sm"
        >
          <MediaThumb
            mediaUrl={save.mediaUrl}
            mediaType={save.media_type}
            alt={save.caption ?? ""}
            width={save.width}
            height={save.height}
          />
          {save.caption && <p className="p-2 text-sm text-muted-foreground">{save.caption}</p>}
        </motion.div>
      ))}
    </motion.div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { ExternalLink, MoreVertical, Trash2, Lock, Unlock, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteSave, setSavePrivacy, updateCaption } from "@/lib/actions/saves";
import { addSaveToBoard } from "@/lib/actions/board-saves";
import type { BoardSummary, SaveWithUrl } from "@/lib/types";

export function SaveCard({
  save,
  boards,
}: {
  save: SaveWithUrl;
  boards: BoardSummary[];
}) {
  const [caption, setCaption] = useState(save.caption ?? "");
  const [isPrivate, setIsPrivate] = useState(save.is_private);
  const [pending, startTransition] = useTransition();

  function saveCaption() {
    if (caption === (save.caption ?? "")) return;
    startTransition(async () => {
      try {
        await updateCaption(save.id, caption);
      } catch {
        toast.error("Could not save caption.");
      }
    });
  }

  function togglePrivacy() {
    const next = !isPrivate;
    setIsPrivate(next);
    startTransition(async () => {
      try {
        await setSavePrivacy(save.id, next);
      } catch {
        setIsPrivate(!next);
        toast.error("Could not update privacy.");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteSave(save.id);
      } catch {
        toast.error("Could not delete save.");
      }
    });
  }

  function handleAddToBoard(boardId: string, boardTitle: string) {
    startTransition(async () => {
      try {
        await addSaveToBoard(boardId, save.id);
        toast.success(`Added to "${boardTitle}"`);
      } catch {
        toast.error("Could not add to board.");
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
      className="group relative mb-4 break-inside-avoid overflow-hidden rounded-lg border bg-card"
    >
      <div className="relative">
        {save.mediaUrl ? (
          save.media_type === "video" ? (
            <video
              src={save.mediaUrl}
              className="w-full"
              style={save.width && save.height ? { aspectRatio: `${save.width} / ${save.height}` } : undefined}
              muted
              loop
              playsInline
              onMouseEnter={(e) => e.currentTarget.play()}
              onMouseLeave={(e) => e.currentTarget.pause()}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={save.mediaUrl}
              alt={save.caption ?? "Saved design"}
              className="w-full"
              style={save.width && save.height ? { aspectRatio: `${save.width} / ${save.height}` } : undefined}
              loading="lazy"
            />
          )
        ) : (
          <div className="flex aspect-square items-center justify-center bg-muted text-xs text-muted-foreground">
            Media unavailable
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <a
            href={save.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur hover:bg-black/80"
          >
            <ExternalLink className="h-3 w-3" />
            Source
          </a>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="icon" variant="secondary" className="h-7 w-7 bg-black/60 text-white hover:bg-black/80" />
              }
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Add to board
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {boards.length === 0 && (
                    <DropdownMenuItem disabled>No boards yet</DropdownMenuItem>
                  )}
                  {boards.map((board) => (
                    <DropdownMenuItem key={board.id} onClick={() => handleAddToBoard(board.id, board.title)}>
                      {board.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onClick={togglePrivacy}>
                {isPrivate ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                {isPrivate ? "Make public" : "Make private"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-2">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={saveCaption}
          placeholder="Add a caption..."
          rows={1}
          className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {isPrivate && (
        <div className="absolute left-2 top-2">
          <Lock className="h-3.5 w-3.5 text-white drop-shadow" />
        </div>
      )}
    </motion.div>
  );
}

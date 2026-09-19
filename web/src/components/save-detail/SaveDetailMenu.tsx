"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Trash2, Lock, Unlock, FolderPlus } from "lucide-react";
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
import { deleteSave, setSavePrivacy } from "@/lib/actions/saves";
import { addSaveToBoard } from "@/lib/actions/board-saves";
import type { BoardSummary } from "@/lib/types";

// Owner-only actions for the save detail page -- same menu shape as
// SaveCard's grid-card dropdown (add to board / privacy / delete), just
// reachable from the single-save view too instead of only from a grid.
export function SaveDetailMenu({
  saveId,
  isPrivate: initialPrivate,
  boards,
}: {
  saveId: string;
  isPrivate: boolean;
  boards: BoardSummary[];
}) {
  const router = useRouter();
  const [isPrivate, setIsPrivate] = useState(initialPrivate);
  const [deleting, setDeleting] = useState(false);

  function togglePrivacy() {
    const next = !isPrivate;
    setIsPrivate(next);
    setSavePrivacy(saveId, next).catch(() => {
      setIsPrivate(!next);
      toast.error("Could not update privacy.");
    });
  }

  function handleAddToBoard(boardId: string, boardTitle: string) {
    addSaveToBoard(boardId, saveId)
      .then(() => toast.success(`Added to "${boardTitle}"`))
      .catch(() => toast.error("Could not add to board."));
  }

  async function handleDelete() {
    if (!confirm("Delete this save? This can't be undone.")) return;
    setDeleting(true);
    try {
      await deleteSave(saveId);
      toast.success("Save deleted");
      // The save no longer exists -- this page's own data is now gone, so
      // move on rather than leaving the visitor looking at a stale detail
      // view for something that was just deleted.
      router.push("/");
    } catch {
      setDeleting(false);
      toast.error("Could not delete save.");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="icon" variant="outline" />}>
        <MoreVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FolderPlus className="mr-2 h-4 w-4" />
            Add to board
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {boards.length === 0 && <DropdownMenuItem disabled>No boards yet</DropdownMenuItem>}
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
        <DropdownMenuItem onClick={handleDelete} disabled={deleting} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          {deleting ? "Deleting..." : "Delete"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

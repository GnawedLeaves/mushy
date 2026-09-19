"use client";

import { useState } from "react";
import { Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { deleteBoard, setBoardPrivacy, updateBoard } from "@/lib/actions/boards";
import { BOARD_TITLE_MAX, BOARD_DESCRIPTION_MAX } from "@/lib/limits";
import { isRedirectError } from "@/lib/isRedirectError";
import type { BoardRow } from "@/lib/types";

export function BoardSettingsMenu({ board }: { board: BoardRow }) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPrivate, setIsPrivate] = useState(board.is_private);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function togglePrivacy(next: boolean) {
    setIsPrivate(next);
    setBoardPrivacy(board.id, next).catch(() => {
      setIsPrivate(!next);
      toast.error("Could not update privacy.");
    });
  }

  async function handleUpdate(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await updateBoard(board.id, formData);
    setPending(false);
    if (result?.error) {
      setError(result.error);
    } else {
      setEditOpen(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${board.title}"? Saves inside it are kept, just ungrouped.`)) return;
    setDeleting(true);
    try {
      await deleteBoard(board.id);
      // deleteBoard redirects on success -- redirect() throws internally, so
      // reaching this line at all means it did NOT redirect, i.e. it
      // returned normally without deleting. There's currently no such path,
      // but if one's added later this keeps the pending state honest.
    } catch (err) {
      if (isRedirectError(err)) {
        // A redirect error means success -- the navigation is already
        // underway, so leave `deleting` true rather than flashing it back off.
        toast.success("Board deleted");
      } else {
        setDeleting(false);
        toast.error("Could not delete board.");
      }
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm">
        <Label htmlFor="board-private">Private</Label>
        <Switch id="board-private" checked={isPrivate} onCheckedChange={togglePrivacy} />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="icon" variant="outline" />}>
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit board</DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} disabled={deleting} className="text-destructive">
            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            {deleting ? "Deleting..." : "Delete board"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit board</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={board.title} required maxLength={BOARD_TITLE_MAX} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={board.description ?? ""}
                rows={3}
                maxLength={BOARD_DESCRIPTION_MAX}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

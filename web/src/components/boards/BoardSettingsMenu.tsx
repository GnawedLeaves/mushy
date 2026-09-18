"use client";

import { useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
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
import type { BoardRow } from "@/lib/types";

export function BoardSettingsMenu({ board }: { board: BoardRow }) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPrivate, setIsPrivate] = useState(board.is_private);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

  function handleDelete() {
    if (!confirm(`Delete "${board.title}"? Saves inside it are kept, just ungrouped.`)) return;
    deleteBoard(board.id).catch(() => toast.error("Could not delete board."));
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
          <DropdownMenuItem onClick={handleDelete} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete board
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
              <Input id="title" name="title" defaultValue={board.title} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={board.description ?? ""} rows={3} />
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

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBoard } from "@/lib/actions/boards";
import { BOARD_TITLE_MAX, BOARD_DESCRIPTION_MAX } from "@/lib/limits";
import { isRedirectError } from "@/lib/isRedirectError";

export function CreateBoardDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      const result = await createBoard(formData);
      setPending(false);
      if (result?.error) setError(result.error);
    } catch (err) {
      // createBoard redirects to the new board on success -- redirect()
      // throws internally to signal navigation, so reaching this catch on
      // success is expected. Only a genuine error should update state here;
      // otherwise leave `pending` true while the navigation is in flight.
      if (!isRedirectError(err)) {
        setPending(false);
        setError("Could not create board.");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-1 h-4 w-4" />
        New board
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a moodboard</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required autoFocus maxLength={BOARD_TITLE_MAX} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" name="description" rows={3} maxLength={BOARD_DESCRIPTION_MAX} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create board"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

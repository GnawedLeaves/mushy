"use client";

import { useState, useTransition } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setSaveReaction } from "@/lib/actions/reactions";
import { cn } from "@/lib/utils";
import type { ReactionType } from "@/lib/supabase/database.types";

export function ReactionButtons({
  saveId,
  initialLikes,
  initialDislikes,
  initialMyReaction,
  canReact,
}: {
  saveId: string;
  initialLikes: number;
  initialDislikes: number;
  initialMyReaction: ReactionType | null;
  canReact: boolean;
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [myReaction, setMyReaction] = useState(initialMyReaction);
  const [, startTransition] = useTransition();

  function react(next: ReactionType) {
    if (!canReact) {
      toast.error("Log in to react.");
      return;
    }

    // Clicking the already-active button toggles it off.
    const nextReaction = myReaction === next ? null : next;
    const prev = { likes, dislikes, myReaction };

    // Optimistic count math: undo the previous reaction's tally (if any),
    // then apply the new one.
    let nextLikes = likes;
    let nextDislikes = dislikes;
    if (prev.myReaction === "like") nextLikes -= 1;
    if (prev.myReaction === "dislike") nextDislikes -= 1;
    if (nextReaction === "like") nextLikes += 1;
    if (nextReaction === "dislike") nextDislikes += 1;

    setLikes(nextLikes);
    setDislikes(nextDislikes);
    setMyReaction(nextReaction);

    startTransition(async () => {
      try {
        await setSaveReaction(saveId, nextReaction);
      } catch {
        setLikes(prev.likes);
        setDislikes(prev.dislikes);
        setMyReaction(prev.myReaction);
        toast.error("Could not update reaction.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={myReaction === "like" ? "default" : "outline"}
        size="sm"
        className="gap-1.5"
        onClick={() => react("like")}
      >
        <ThumbsUp className={cn("h-4 w-4", myReaction === "like" && "fill-current")} />
        {likes}
      </Button>
      <Button
        variant={myReaction === "dislike" ? "default" : "outline"}
        size="sm"
        className="gap-1.5"
        onClick={() => react("dislike")}
      >
        <ThumbsDown className={cn("h-4 w-4", myReaction === "dislike" && "fill-current")} />
        {dislikes}
      </Button>
    </div>
  );
}

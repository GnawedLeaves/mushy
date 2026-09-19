"use client";

import { useState, useTransition } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { setCommentReaction } from "@/lib/actions/comments";
import { cn } from "@/lib/utils";
import type { ReactionType } from "@/lib/supabase/database.types";

export function CommentReactionButtons({
  commentId,
  saveId,
  initialLikes,
  initialDislikes,
  initialMyReaction,
}: {
  commentId: string;
  saveId: string;
  initialLikes: number;
  initialDislikes: number;
  initialMyReaction: ReactionType | null;
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [myReaction, setMyReaction] = useState(initialMyReaction);
  const [, startTransition] = useTransition();

  function react(next: ReactionType) {
    const nextReaction = myReaction === next ? null : next;
    const prev = { likes, dislikes, myReaction };

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
        await setCommentReaction(commentId, saveId, nextReaction);
      } catch {
        setLikes(prev.likes);
        setDislikes(prev.dislikes);
        setMyReaction(prev.myReaction);
      }
    });
  }

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <button
        onClick={() => react("like")}
        className={cn("flex items-center gap-1 hover:text-foreground", myReaction === "like" && "text-foreground")}
      >
        <ThumbsUp className={cn("h-3.5 w-3.5", myReaction === "like" && "fill-current")} />
        {likes}
      </button>
      <button
        onClick={() => react("dislike")}
        className={cn("flex items-center gap-1 hover:text-foreground", myReaction === "dislike" && "text-foreground")}
      >
        <ThumbsDown className={cn("h-3.5 w-3.5", myReaction === "dislike" && "fill-current")} />
        {dislikes}
      </button>
    </div>
  );
}

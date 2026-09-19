"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CommentReactionButtons } from "@/components/save-detail/CommentReactionButtons";
import { addComment, deleteComment, type CommentWithMeta } from "@/lib/actions/comments";
import { COMMENT_MAX } from "@/lib/limits";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function CommentSection({
  saveId,
  initialComments,
  canComment,
}: {
  saveId: string;
  initialComments: CommentWithMeta[];
  canComment: boolean;
}) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await addComment(saveId, trimmed);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      // No id/author info comes back from addComment (it only signals
      // success/failure) -- rather than guess at the shape, just append a
      // client-only optimistic row; the next full page load reconciles it
      // with the real one via revalidatePath.
      setComments((prev) => [
        ...prev,
        {
          id: `optimistic-${Date.now()}`,
          body: trimmed,
          created_at: new Date().toISOString(),
          author: { username: "you", display_name: "You" },
          likes: 0,
          dislikes: 0,
          myReaction: null,
          isOwn: true,
        },
      ]);
      setBody("");
    });
  }

  function handleDelete(commentId: string) {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    deleteComment(commentId, saveId).catch(() => toast.error("Could not delete comment."));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        {comments.length === 0 ? "Comments" : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
      </h2>

      {canComment && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            maxLength={COMMENT_MAX}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={pending || !body.trim()}>
              {pending ? "Posting..." : "Comment"}
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-start justify-between gap-2 border-b pb-4 last:border-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{comment.author.display_name || `@${comment.author.username}`}</span>
                <span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span>
              </div>
              <p className="text-sm">{comment.body}</p>
              <CommentReactionButtons
                commentId={comment.id}
                saveId={saveId}
                initialLikes={comment.likes}
                initialDislikes={comment.dislikes}
                initialMyReaction={comment.myReaction}
              />
            </div>
            {comment.isOwn && (
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => handleDelete(comment.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

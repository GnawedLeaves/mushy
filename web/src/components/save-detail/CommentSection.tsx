"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
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
  viewerUsername,
  viewerDisplayName,
  viewerAvatarUrl,
}: {
  saveId: string;
  initialComments: CommentWithMeta[];
  canComment: boolean;
  viewerUsername?: string | null;
  viewerDisplayName?: string | null;
  viewerAvatarUrl?: string | null;
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
      if (result.error || !result.id) {
        toast.error(result.error ?? "Could not post comment.");
        return;
      }
      // Use the id the server actually assigned -- deleting this comment
      // before the next revalidation needs a real uuid to send back.
      setComments((prev) => [
        ...prev,
        {
          id: result.id!,
          body: trimmed,
          created_at: result.createdAt ?? new Date().toISOString(),
          author: {
            username: viewerUsername ?? "you",
            display_name: viewerDisplayName ?? "You",
            avatarUrl: viewerAvatarUrl ?? null,
          },
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
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {body.length}/{COMMENT_MAX}
            </span>
            <Button type="submit" size="sm" disabled={pending || !body.trim()}>
              {pending ? "Posting..." : "Comment"}
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-start justify-between gap-2 border-b pb-4 last:border-0">
            <div className="flex items-start gap-3">
              <ProfileAvatar
                avatarUrl={comment.author.avatarUrl}
                label={comment.author.display_name || comment.author.username}
                className="h-8 w-8 text-xs"
              />
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

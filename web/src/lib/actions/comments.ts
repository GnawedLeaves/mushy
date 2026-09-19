"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COMMENT_MAX } from "@/lib/limits";
import type { ReactionType } from "@/lib/supabase/database.types";

export interface CommentWithMeta {
  id: string;
  body: string;
  created_at: string;
  author: { username: string; display_name: string | null; avatarUrl: string | null };
  likes: number;
  dislikes: number;
  myReaction: ReactionType | null;
  isOwn: boolean;
}

// Top-level comments only for now (parent_comment_id is nullable in the
// schema specifically so a reply thread can be added later without another
// migration -- this query just doesn't surface replies yet).
export async function listComments(saveId: string): Promise<CommentWithMeta[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: comments } = await supabase
    .from("comments")
    .select("id, body, created_at, user_id")
    .eq("save_id", saveId)
    .is("parent_comment_id", null)
    .order("created_at", { ascending: true });

  const rows = comments ?? [];
  if (rows.length === 0) return [];

  const commentIds = rows.map((c) => c.id);
  const authorIds = [...new Set(rows.map((c) => c.user_id))];

  // Same reason as Discover's attribution join (lib/actions/discover.ts):
  // no direct FK from comments to profiles (both key off auth.users
  // independently), so PostgREST can't auto-embed -- fetch separately.
  const [{ data: authors }, { data: reactions }] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, avatar_path, updated_at").in("id", authorIds),
    supabase.from("comment_reactions").select("comment_id, user_id, reaction").in("comment_id", commentIds),
  ]);

  const authorById = new Map((authors ?? []).map((a) => [a.id, a]));
  // Avatars always upload to the same fixed storage key (lib/actions/profile.ts's
  // uploadAvatar), so the URL itself never changes when someone replaces their
  // photo -- comments looked up the *current* avatar_path already (this was
  // never hard-saved onto the comment row), but without a cache-busting query
  // param the browser just kept serving whatever it had cached for that
  // unchanged URL, which is what actually made an old photo "stick". Same fix
  // as lib/media.ts's getAvatarUrl.
  const avatarUrl = (path: string | null, updatedAt: string | null) =>
    path ? `${supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${encodeURIComponent(updatedAt ?? "")}` : null;
  const tally = new Map<string, { like: number; dislike: number; mine: ReactionType | null }>();
  for (const id of commentIds) tally.set(id, { like: 0, dislike: 0, mine: null });
  for (const r of reactions ?? []) {
    const bucket = tally.get(r.comment_id);
    if (!bucket) continue;
    if (r.reaction === "like") bucket.like += 1;
    else bucket.dislike += 1;
    if (user && r.user_id === user.id) bucket.mine = r.reaction;
  }

  return rows.map((c) => {
    const author = authorById.get(c.user_id);
    const bucket = tally.get(c.id)!;
    return {
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      author: {
        username: author?.username ?? "unknown",
        display_name: author?.display_name ?? null,
        avatarUrl: avatarUrl(author?.avatar_path ?? null, author?.updated_at ?? null),
      },
      likes: bucket.like,
      dislikes: bucket.dislike,
      myReaction: bucket.mine,
      isOwn: user?.id === c.user_id,
    };
  });
}

export async function addComment(
  saveId: string,
  body: string
): Promise<{ error: string | null; id?: string; createdAt?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const trimmed = body.trim().slice(0, COMMENT_MAX);
  if (!trimmed) return { error: "Comment can't be empty." };

  // Returning the real row (rather than just a success signal) lets the
  // caller use the actual uuid for its optimistic entry -- a client-made-up
  // placeholder id previously got passed straight to deleteComment if the
  // user deleted before the next revalidation, which Postgres rejected with
  // "invalid input syntax for type uuid" since it was never a real row id.
  const { data, error } = await supabase
    .from("comments")
    .insert({ save_id: saveId, user_id: user.id, body: trimmed })
    .select("id, created_at")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not post comment." };

  // Best-effort, same as setSaveReaction's like notification -- runs as
  // this (the commenter's) own RLS-scoped client, so it can only ever be
  // attributed to themselves as actor_id, and never blocks the comment
  // itself from landing if it fails.
  const { data: save } = await supabase.from("saves").select("owner_id").eq("id", saveId).maybeSingle();
  if (save && save.owner_id !== user.id) {
    try {
      await supabase
        .from("notifications")
        .insert({ recipient_id: save.owner_id, actor_id: user.id, type: "comment", save_id: saveId, comment_id: data.id });
    } catch {
      // Best-effort -- the comment itself already succeeded above.
    }
  }

  revalidatePath(`/s/${saveId}`);
  return { error: null, id: data.id, createdAt: data.created_at };
}

// No updateComment -- "no editing allowed" is enforced both here (the
// action simply doesn't exist) and at the DB level (0003_reactions_comments.sql
// grants comments no UPDATE policy at all, so even a raw API call is denied).
export async function deleteComment(commentId: string, saveId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath(`/s/${saveId}`);
}

export async function setCommentReaction(commentId: string, saveId: string, reaction: ReactionType | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (reaction === null) {
    const { error } = await supabase
      .from("comment_reactions")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("comment_reactions")
      .upsert({ comment_id: commentId, user_id: user.id, reaction }, { onConflict: "comment_id,user_id" });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/s/${saveId}`);
}

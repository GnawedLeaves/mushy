"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COMMENT_MAX } from "@/lib/limits";
import type { ReactionType } from "@/lib/supabase/database.types";

export interface CommentWithMeta {
  id: string;
  body: string;
  created_at: string;
  author: { username: string; display_name: string | null };
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
    supabase.from("profiles").select("id, username, display_name").in("id", authorIds),
    supabase.from("comment_reactions").select("comment_id, user_id, reaction").in("comment_id", commentIds),
  ]);

  const authorById = new Map((authors ?? []).map((a) => [a.id, a]));
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
      author: { username: author?.username ?? "unknown", display_name: author?.display_name ?? null },
      likes: bucket.like,
      dislikes: bucket.dislike,
      myReaction: bucket.mine,
      isOwn: user?.id === c.user_id,
    };
  });
}

export async function addComment(saveId: string, body: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const trimmed = body.trim().slice(0, COMMENT_MAX);
  if (!trimmed) return { error: "Comment can't be empty." };

  const { error } = await supabase.from("comments").insert({ save_id: saveId, user_id: user.id, body: trimmed });
  if (error) return { error: error.message };

  revalidatePath(`/s/${saveId}`);
  return { error: null };
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

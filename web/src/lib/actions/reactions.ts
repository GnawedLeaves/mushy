"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ReactionType } from "@/lib/supabase/database.types";

export interface ReactionSummary {
  likes: number;
  dislikes: number;
  myReaction: ReactionType | null;
}

export async function getSaveReactionSummary(saveId: string): Promise<ReactionSummary> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count: likes }, { count: dislikes }, mine] = await Promise.all([
    supabase.from("save_reactions").select("*", { count: "exact", head: true }).eq("save_id", saveId).eq("reaction", "like"),
    supabase.from("save_reactions").select("*", { count: "exact", head: true }).eq("save_id", saveId).eq("reaction", "dislike"),
    user
      ? supabase.from("save_reactions").select("reaction").eq("save_id", saveId).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return { likes: likes ?? 0, dislikes: dislikes ?? 0, myReaction: mine.data?.reaction ?? null };
}

// Pass `reaction: null` to clear your reaction (clicking an already-active
// button toggles it off, handled by the caller).
export async function setSaveReaction(saveId: string, reaction: ReactionType | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (reaction === null) {
    const { error } = await supabase.from("save_reactions").delete().eq("save_id", saveId).eq("user_id", user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("save_reactions")
      .upsert({ save_id: saveId, user_id: user.id, reaction }, { onConflict: "save_id,user_id" });
    if (error) throw new Error(error.message);

    // Only "like" notifies -- a dislike isn't something worth surfacing to
    // the owner the way a like or a comment is. Runs as this (the actor's)
    // own RLS-scoped client, which is exactly why the notifications insert
    // policy requires actor_id = auth.uid(): this insert can only ever be
    // attributed to whoever is actually calling it. Best-effort: a failure
    // here (e.g. self-like, which the recipient_id = actor_id case still
    // inserts harmlessly) never blocks the reaction itself from landing.
    if (reaction === "like") {
      const { data: save } = await supabase.from("saves").select("owner_id").eq("id", saveId).maybeSingle();
      if (save && save.owner_id !== user.id) {
        try {
          await supabase.from("notifications").insert({ recipient_id: save.owner_id, actor_id: user.id, type: "save_like", save_id: saveId });
        } catch {
          // Best-effort -- the reaction itself already succeeded above.
        }
      }
    }
  }

  revalidatePath(`/s/${saveId}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { positionBetween } from "@/lib/reorder";
import { SAVE_CAPTION_MAX } from "@/lib/limits";

export async function updateCaption(saveId: string, caption: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const trimmed = caption.trim().slice(0, SAVE_CAPTION_MAX);

  // Ownership is enforced by RLS ("saves: write own"), but filtering by
  // owner_id here too means a stray ID for someone else's save fails
  // silently (0 rows updated) instead of relying on RLS alone.
  const { error } = await supabase
    .from("saves")
    .update({ caption: trimmed || null })
    .eq("id", saveId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function setSavePrivacy(saveId: string, isPrivate: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("saves")
    .update({ is_private: isPrivate })
    .eq("id", saveId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteSave(saveId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: save } = await supabase
    .from("saves")
    .select("storage_path")
    .eq("id", saveId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!save) throw new Error("Save not found.");

  await supabase.storage.from("media").remove([save.storage_path]);

  const { error } = await supabase
    .from("saves")
    .delete()
    .eq("id", saveId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// Reorders a save to sit between `beforeSaveId` and `afterSaveId` in the
// caller's flat gallery order (either may be null at a list edge).
export async function reorderSave(
  saveId: string,
  beforeSaveId: string | null,
  afterSaveId: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const [beforeRow, afterRow] = await Promise.all([
    beforeSaveId
      ? supabase.from("saves").select("position").eq("id", beforeSaveId).eq("owner_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    afterSaveId
      ? supabase.from("saves").select("position").eq("id", afterSaveId).eq("owner_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const newPosition = positionBetween(beforeRow.data?.position ?? null, afterRow.data?.position ?? null);

  const { error } = await supabase
    .from("saves")
    .update({ position: newPosition })
    .eq("id", saveId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

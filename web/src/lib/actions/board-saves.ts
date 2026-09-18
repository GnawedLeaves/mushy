"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { positionAtEnd, positionBetween } from "@/lib/reorder";

export async function addSaveToBoard(boardId: string, saveId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: maxRow } = await supabase
    .from("board_saves")
    .select("position")
    .eq("board_id", boardId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("board_saves").insert({
    board_id: boardId,
    save_id: saveId,
    owner_id: user.id,
    position: positionAtEnd(maxRow?.position ?? null),
  });

  // RLS ("board_saves: write own") already checks the caller owns both the
  // board and the save; a unique-violation here just means it's already on
  // the board, which is fine to no-op rather than error.
  if (error && error.code !== "23505") throw new Error(error.message);

  revalidatePath(`/boards/${boardId}`);
  revalidatePath("/");
}

export async function removeSaveFromBoard(boardId: string, saveId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("board_saves")
    .delete()
    .eq("board_id", boardId)
    .eq("save_id", saveId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath(`/boards/${boardId}`);
}

export async function reorderSaveInBoard(
  boardId: string,
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
      ? supabase
          .from("board_saves")
          .select("position")
          .eq("board_id", boardId)
          .eq("save_id", beforeSaveId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    afterSaveId
      ? supabase
          .from("board_saves")
          .select("position")
          .eq("board_id", boardId)
          .eq("save_id", afterSaveId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const newPosition = positionBetween(beforeRow.data?.position ?? null, afterRow.data?.position ?? null);

  const { error } = await supabase
    .from("board_saves")
    .update({ position: newPosition })
    .eq("board_id", boardId)
    .eq("save_id", saveId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath(`/boards/${boardId}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createBoard(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Give the board a title." };

  const description = String(formData.get("description") ?? "").trim();

  const { data, error } = await supabase
    .from("boards")
    .insert({ owner_id: user.id, title, description: description || null })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not create board." };

  revalidatePath("/boards");
  redirect(`/boards/${data.id}`);
}

export async function updateBoard(boardId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title) return { error: "Give the board a title." };

  const { error } = await supabase
    .from("boards")
    .update({ title, description: description || null })
    .eq("id", boardId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/boards/${boardId}`);
  revalidatePath("/boards");
  return { error: null };
}

export async function setBoardPrivacy(boardId: string, isPrivate: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("boards")
    .update({ is_private: isPrivate })
    .eq("id", boardId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath(`/boards/${boardId}`);
  revalidatePath("/boards");
}

export async function deleteBoard(boardId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // board_saves rows cascade-delete via the FK; the underlying saves and
  // their media are untouched -- deleting a board never deletes a save.
  const { error } = await supabase.from("boards").delete().eq("id", boardId).eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/boards");
  redirect("/boards");
}

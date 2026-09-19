"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSignedMediaUrls } from "@/lib/media";
import { AVAILABLE_SAVES_PAGE_SIZE } from "@/lib/limits";
import { positionAtEnd, positionBetween } from "@/lib/reorder";
import type { SaveWithUrl } from "@/lib/types";

export interface AvailableSavesCursor {
  createdAt: string;
  id: string;
}

export interface AvailableSavesPage {
  saves: SaveWithUrl[];
  nextCursor: AvailableSavesCursor | null;
}

// The "Add saves" dialog used to be handed the owner's *entire* library
// (unbounded `.select("*")`, no limit) so it could render whatever wasn't
// on the board yet. For anyone with a real library that meant signing and
// rendering potentially hundreds of full-resolution images the moment the
// dialog opened -- no tapping required -- which is heavy enough on mobile
// to look like the app crashing. This mirrors Gallery/Discover's existing
// keyset-paginated "load more" pattern (see loadMoreDiscoverSaves) instead.
export async function loadMoreAvailableSaves(
  boardId: string,
  cursor: AvailableSavesCursor | null
): Promise<AvailableSavesPage> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { saves: [], nextCursor: null };

  const { data: onBoardRows } = await supabase.from("board_saves").select("save_id").eq("board_id", boardId);
  const onBoardIds = (onBoardRows ?? []).map((r) => r.save_id);

  let query = supabase
    .from("saves")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(AVAILABLE_SAVES_PAGE_SIZE);

  if (onBoardIds.length > 0) query = query.not("id", "in", `(${onBoardIds.join(",")})`);
  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }

  const { data: saves } = await query;
  const rows = saves ?? [];
  if (rows.length === 0) return { saves: [], nextCursor: null };

  const urlMap = await getSignedMediaUrls(rows.map((s) => s.storage_path));
  const savesWithUrls: SaveWithUrl[] = rows.map((s) => ({ ...s, mediaUrl: urlMap[s.storage_path] ?? null }));

  const last = rows[rows.length - 1];
  const nextCursor = rows.length === AVAILABLE_SAVES_PAGE_SIZE && last ? { createdAt: last.created_at, id: last.id } : null;

  return { saves: savesWithUrls, nextCursor };
}

export async function addSaveToBoard(boardId: string, saveId: string) {
  return addSavesToBoard(boardId, [saveId]);
}

// Batched form of addSaveToBoard -- the "Add saves" dialog lets someone tap
// through a whole handful of images in a few seconds, and firing one
// Server Action (and the revalidatePath-triggered page refresh that comes
// with it) per tap meant a burst of taps queued up that many full
// signed-URL refetches back to back. On mobile that was slow enough to
// look like a crash, and a tap whose request got superseded/dropped mid
// burst was how "only 1 got added" happened. AddSavesDialog now debounces
// taps into a single call here instead.
export async function addSavesToBoard(boardId: string, saveIds: string[]) {
  if (saveIds.length === 0) return;

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

  let cursor = maxRow?.position ?? null;
  const rows = saveIds.map((saveId) => {
    const position = positionAtEnd(cursor);
    cursor = position;
    return { board_id: boardId, save_id: saveId, owner_id: user.id, position };
  });

  // ignoreDuplicates rather than a plain insert: a single INSERT statement
  // fails (and writes nothing) the moment any one row's (board_id, save_id)
  // already exists, which a bulk add can easily hit if a save was already
  // on the board -- ON CONFLICT DO NOTHING skips just that row instead of
  // rejecting the whole batch. RLS ("board_saves: write own") already
  // checks the caller owns both the board and every save.
  const { error } = await supabase.from("board_saves").upsert(rows, {
    onConflict: "board_id,save_id",
    ignoreDuplicates: true,
  });
  if (error) throw new Error(error.message);

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

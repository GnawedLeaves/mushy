"use server";

import { createClient } from "@/lib/supabase/server";
import { getSignedMediaUrls } from "@/lib/media";
import type { SaveWithUrl } from "@/lib/types";

const PAGE_SIZE = 24;

export interface GalleryCursor {
  createdAt: string;
  id: string;
}

export interface GalleryPage {
  saves: SaveWithUrl[];
  nextCursor: GalleryCursor | null;
}

// Cursor pagination on (created_at desc, id desc) -- id breaks ties when two
// saves share a created_at timestamp. Used for the infinite-scroll "Date
// saved" feed; the drag-reorderable "My order" view still loads in full,
// since a full ordered list is what dnd-kit needs for reorder context.
export async function loadMoreSaves(cursor: GalleryCursor | null): Promise<GalleryPage> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { saves: [], nextCursor: null };

  let query = supabase
    .from("saves")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }

  const { data } = await query;
  const saves = data ?? [];

  const urlMap = await getSignedMediaUrls(saves.map((s) => s.storage_path));
  const savesWithUrls: SaveWithUrl[] = saves.map((s) => ({ ...s, mediaUrl: urlMap[s.storage_path] ?? null }));

  const last = saves[saves.length - 1];
  const nextCursor = saves.length === PAGE_SIZE && last ? { createdAt: last.created_at, id: last.id } : null;

  return { saves: savesWithUrls, nextCursor };
}

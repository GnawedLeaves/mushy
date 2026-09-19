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

const TAG_SEARCH_LIMIT = 60;
const TAG_SCAN_LIMIT = 500;
const TAG_SUGGESTION_LIMIT = 8;

// Same hidden-tag search as Discover's searchSavesByTag (lib/actions/discover.ts),
// scoped to the caller's own saves instead of other people's public ones --
// tags are never shown in the UI, only used as a filter here. Multiple tags
// are OR'd (a save matches if it has ANY of them), via Postgres's array
// overlap operator (.overlaps) rather than .contains (which requires ALL of
// them present on the same save -- AND, not OR).
export async function searchMySavesByTags(rawTags: string[]): Promise<SaveWithUrl[]> {
  const tags = [...new Set(rawTags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  if (tags.length === 0) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("saves")
    .select("*")
    .eq("owner_id", user.id)
    .overlaps("tags", tags)
    .order("created_at", { ascending: false })
    .limit(TAG_SEARCH_LIMIT);

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const urlMap = await getSignedMediaUrls(rows.map((s) => s.storage_path));
  return rows.map((s) => ({ ...s, mediaUrl: urlMap[s.storage_path] ?? null }));
}

// Autocomplete source for the tag search box. Tags are free-form AI output
// (see lib/ai/aestheticTags.ts), often multi-word and specific ("cassette
// futurism", "mecha aesthetic") -- typing one out exactly from memory isn't
// realistic, so this scans a bounded window of the caller's own recent
// saves, flattens their tags, and returns whichever actually-used ones
// contain the query. No dedicated tags table/index exists, so this is a
// straightforward in-memory scan rather than a DB-side distinct query --
// fine at personal-app scale, and it only ever runs over the caller's own
// saves here.
export async function suggestMyTags(query: string): Promise<string[]> {
  const q = query.trim().toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("saves")
    .select("tags")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(TAG_SCAN_LIMIT);

  const seen = new Set<string>();
  for (const row of data ?? []) {
    for (const tag of row.tags ?? []) seen.add(tag);
  }

  const all = [...seen];
  const matches = q ? all.filter((t) => t.includes(q)) : all;
  matches.sort((a, b) => a.length - b.length || a.localeCompare(b));
  return matches.slice(0, TAG_SUGGESTION_LIMIT);
}

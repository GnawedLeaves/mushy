"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSignedMediaUrls } from "@/lib/media";
import { positionAtEnd } from "@/lib/reorder";
import type { SaveWithUrl } from "@/lib/types";

const PAGE_SIZE = 24;

export interface DiscoverCursor {
  createdAt: string;
  id: string;
}

export interface DiscoverSave extends SaveWithUrl {
  owner: { username: string; display_name: string | null };
}

export interface DiscoverPage {
  saves: DiscoverSave[];
  nextCursor: DiscoverCursor | null;
}

// `saves.owner_id` FKs to auth.users, not to public.profiles (they're
// sibling tables keyed by the same id) -- so PostgREST can't auto-embed
// profiles via `.select("*, profiles(...)")` here; there's no declared FK
// path between the two tables it can traverse. Fetching profiles as a
// second batched query and merging them here is the workaround.
export async function loadMoreDiscoverSaves(cursor: DiscoverCursor | null): Promise<DiscoverPage> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { saves: [], nextCursor: null };

  let query = supabase
    .from("saves")
    .select("*")
    .neq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }

  const { data: saves } = await query;
  const rows = saves ?? [];
  if (rows.length === 0) return { saves: [], nextCursor: null };

  const ownerIds = [...new Set(rows.map((s) => s.owner_id))];
  const [{ data: profiles }, urlMap] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name").in("id", ownerIds),
    getSignedMediaUrls(rows.map((s) => s.storage_path)),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const discoverSaves: DiscoverSave[] = rows.map((s) => ({
    ...s,
    mediaUrl: urlMap[s.storage_path] ?? null,
    owner: {
      username: profileById.get(s.owner_id)?.username ?? "unknown",
      display_name: profileById.get(s.owner_id)?.display_name ?? null,
    },
  }));

  const last = rows[rows.length - 1];
  const nextCursor = rows.length === PAGE_SIZE && last ? { createdAt: last.created_at, id: last.id } : null;

  return { saves: discoverSaves, nextCursor };
}

const TAG_SCAN_LIMIT = 500;
const TAG_SUGGESTION_LIMIT = 8;

// Same scan-and-flatten approach as Gallery's suggestMyTags (lib/actions/gallery.ts),
// scoped to public saves that aren't the caller's own -- there's no
// dedicated tags table to query distinct values from, so this reads a
// bounded window of visible saves' tags and filters in app code.
export async function suggestDiscoverTags(query: string): Promise<string[]> {
  const q = query.trim().toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("saves")
    .select("tags")
    .neq("owner_id", user.id)
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

// Tags are AI-generated at save time (see lib/ai/aestheticTags.ts) and never
// shown in the UI -- this is the only place they're read, as a hidden filter
// over the same "not mine" visibility rule loadMoreDiscoverSaves uses (RLS
// still gates which rows are visible at all; this just narrows further).
// Multiple tags are OR'd (.overlaps -- any shared tag matches), not AND'd.
export async function searchSavesByTags(rawTags: string[]): Promise<DiscoverSave[]> {
  const tags = [...new Set(rawTags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  if (tags.length === 0) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: saves } = await supabase
    .from("saves")
    .select("*")
    .neq("owner_id", user.id)
    .overlaps("tags", tags)
    .order("created_at", { ascending: false })
    .limit(60);

  const rows = saves ?? [];
  if (rows.length === 0) return [];

  const ownerIds = [...new Set(rows.map((s) => s.owner_id))];
  const [{ data: profiles }, urlMap] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name").in("id", ownerIds),
    getSignedMediaUrls(rows.map((s) => s.storage_path)),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return rows.map((s) => ({
    ...s,
    mediaUrl: urlMap[s.storage_path] ?? null,
    owner: {
      username: profileById.get(s.owner_id)?.username ?? "unknown",
      display_name: profileById.get(s.owner_id)?.display_name ?? null,
    },
  }));
}

export interface DomeGalleryItem {
  id: string;
  src: string;
  alt: string;
}

export interface DomeGalleryPage {
  items: DomeGalleryItem[];
  nextOffset: number | null;
}

const DOME_PAGE_SIZE = 48;
// Matches the Dome Gallery component's own default tile capacity
// (segments=35 -> 35*5 = 175 slots) -- beyond this, more images would just
// start recycling into already-used slots rather than filling new ones, so
// there's no point fetching further.
const DOME_MAX_ITEMS = 150;

// Feeds the desktop Dome Gallery view of Discover (components/discover/DomeGalleryDiscover.tsx).
// Offset-based, not the keyset pagination loadMoreDiscoverSaves uses --
// popularity has no stable sort key to build a keyset cursor from without a
// materialized column, so both sort modes here just share the simpler
// (offset, capped pool) model instead of maintaining two different cursor
// shapes for one gallery.
export async function loadDomeGalleryPage(
  offset: number,
  tags: string[],
  sort: "recency" | "popularity"
): Promise<DomeGalleryPage> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], nextOffset: null };
  if (offset >= DOME_MAX_ITEMS) return { items: [], nextOffset: null };

  let query = supabase.from("saves").select("id, storage_path, caption").neq("owner_id", user.id);
  const cleanTags = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  if (cleanTags.length > 0) query = query.overlaps("tags", cleanTags);

  if (sort === "recency") {
    const { data } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + DOME_PAGE_SIZE - 1);
    const rows = data ?? [];
    const urlMap = await getSignedMediaUrls(rows.map((r) => r.storage_path));
    const items = rows
      .map((r) => ({ id: r.id, src: urlMap[r.storage_path] ?? "", alt: r.caption ?? "" }))
      .filter((i) => i.src);
    const nextOffset = rows.length === DOME_PAGE_SIZE && offset + DOME_PAGE_SIZE < DOME_MAX_ITEMS ? offset + DOME_PAGE_SIZE : null;
    return { items, nextOffset };
  }

  // Popularity: rank a bounded candidate pool by net reactions in app code.
  // At personal-app scale this is a reasonable trade-off against a
  // materialized popularity column with real keyset pagination over an
  // aggregate.
  const { data: candidates } = await query.order("created_at", { ascending: false }).limit(500);
  const rows = candidates ?? [];
  if (rows.length === 0) return { items: [], nextOffset: null };

  const { data: reactions } = await supabase
    .from("save_reactions")
    .select("save_id, reaction")
    .in(
      "save_id",
      rows.map((r) => r.id)
    );
  const score = new Map<string, number>();
  for (const r of reactions ?? []) {
    score.set(r.save_id, (score.get(r.save_id) ?? 0) + (r.reaction === "like" ? 1 : -1));
  }
  const ranked = [...rows].sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0));

  const page = ranked.slice(offset, offset + DOME_PAGE_SIZE);
  const urlMap = await getSignedMediaUrls(page.map((r) => r.storage_path));
  const items = page
    .map((r) => ({ id: r.id, src: urlMap[r.storage_path] ?? "", alt: r.caption ?? "" }))
    .filter((i) => i.src);
  const nextOffset =
    offset + DOME_PAGE_SIZE < ranked.length && offset + DOME_PAGE_SIZE < DOME_MAX_ITEMS ? offset + DOME_PAGE_SIZE : null;
  return { items, nextOffset };
}

// "Repin": copies someone else's public save into the caller's own gallery.
// board_saves rows can only reference a save the caller owns (RLS), so
// discovering something you don't own means making your own copy of it --
// not linking to theirs -- same as Pinterest's repin. The original's
// source_url is carried over so attribution to where it was first found
// isn't lost.
export async function repinSave(sourceSaveId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: source, error: sourceError } = await supabase
    .from("saves")
    .select("*")
    .eq("id", sourceSaveId)
    .maybeSingle();

  if (sourceError || !source) return { error: "Save not found." };
  if (source.owner_id === user.id) return { error: "That's already yours." };

  const newSaveId = randomUUID();
  const ext = source.storage_path.split(".").pop() ?? "bin";
  const newStoragePath = `${user.id}/${newSaveId}.${ext}`;

  // Copy needs SELECT on the source object (granted by the "media: read own
  // or public" storage policy for a public save) and INSERT on the
  // destination (granted by "media: owner can insert", since the
  // destination path is under the caller's own folder).
  const { error: copyError } = await supabase.storage.from("media").copy(source.storage_path, newStoragePath);
  if (copyError) return { error: `Could not copy media: ${copyError.message}` };

  const { data: maxRow } = await supabase
    .from("saves")
    .select("position")
    .eq("owner_id", user.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: insertError } = await supabase.from("saves").insert({
    id: newSaveId,
    owner_id: user.id,
    storage_path: newStoragePath,
    media_type: source.media_type,
    mime_type: source.mime_type,
    file_size_bytes: source.file_size_bytes,
    width: source.width,
    height: source.height,
    source_url: source.source_url,
    source_title: source.source_title,
    position: positionAtEnd(maxRow?.position ?? null),
    tags: source.tags,
  });

  if (insertError) {
    await supabase.storage.from("media").remove([newStoragePath]);
    return { error: insertError.message };
  }

  revalidatePath("/");
  return { error: null };
}

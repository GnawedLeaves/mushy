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

// Tags are AI-generated at save time (see lib/ai/aestheticTags.ts) and never
// shown in the UI -- this is the only place they're read, as a hidden filter
// over the same "not mine" visibility rule loadMoreDiscoverSaves uses (RLS
// still gates which rows are visible at all; this just narrows further).
export async function searchSavesByTag(rawTag: string): Promise<DiscoverSave[]> {
  const tag = rawTag.trim().toLowerCase();
  if (!tag) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: saves } = await supabase
    .from("saves")
    .select("*")
    .neq("owner_id", user.id)
    .contains("tags", [tag])
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

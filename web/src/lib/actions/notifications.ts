"use server";

import { createClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/lib/supabase/database.types";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  saveId: string;
  commentPreview: string | null;
  actor: { username: string; displayName: string | null; avatarUrl: string | null };
  createdAt: string;
  read: boolean;
}

const NOTIFICATIONS_LIMIT = 30;

// Same "no direct FK to profiles" pattern as Discover/comments (saves and
// notifications both key actor/owner off auth.users, not public.profiles),
// so attribution needs a second batched query rather than an embedded
// select.
export async function listNotifications(): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from("notifications")
    .select("id, type, actor_id, save_id, comment_id, read_at, created_at")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(NOTIFICATIONS_LIMIT);

  const notifications = rows ?? [];
  if (notifications.length === 0) return [];

  const actorIds = [...new Set(notifications.map((n) => n.actor_id))];
  const commentIds = notifications.map((n) => n.comment_id).filter((id): id is string => !!id);

  const [{ data: actors }, { data: comments }] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, avatar_path, updated_at").in("id", actorIds),
    commentIds.length > 0
      ? supabase.from("comments").select("id, body").in("id", commentIds)
      : Promise.resolve({ data: [] as { id: string; body: string }[] }),
  ]);

  const actorById = new Map((actors ?? []).map((a) => [a.id, a]));
  const commentById = new Map((comments ?? []).map((c) => [c.id, c.body]));

  return notifications.map((n) => {
    const actor = actorById.get(n.actor_id);
    // Same cache-busting need as comments (lib/actions/comments.ts) and
    // getAvatarUrl (lib/media.ts) -- the storage key never changes when
    // someone replaces their photo, only a query param forces a refetch.
    const avatarUrl = actor?.avatar_path
      ? `${supabase.storage.from("avatars").getPublicUrl(actor.avatar_path).data.publicUrl}?v=${encodeURIComponent(actor.updated_at ?? "")}`
      : null;
    return {
      id: n.id,
      type: n.type,
      saveId: n.save_id,
      commentPreview: n.comment_id ? (commentById.get(n.comment_id) ?? null) : null,
      actor: {
        username: actor?.username ?? "unknown",
        displayName: actor?.display_name ?? null,
        avatarUrl,
      },
      createdAt: n.created_at,
      read: n.read_at !== null,
    };
  });
}

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  return count ?? 0;
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);
}

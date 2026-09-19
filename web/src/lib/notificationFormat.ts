import type { NotificationItem } from "@/lib/actions/notifications";

// Shared by the desktop dropdown (NotificationBell) and the mobile full
// page (app/notifications) so the two surfaces never drift out of sync on
// wording/timestamp formatting.
export function notificationTimeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function describeNotification(n: NotificationItem): string {
  const name = n.actor.displayName || `@${n.actor.username}`;
  if (n.type === "save_like") return `${name} liked your save`;
  if (n.type === "save_dislike") return `${name} disliked your save`;
  return `${name} commented: "${n.commentPreview ?? "..."}"`;
}

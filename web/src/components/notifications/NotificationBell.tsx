"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  type NotificationItem,
} from "@/lib/actions/notifications";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { notificationTimeAgo, describeNotification } from "@/lib/notificationFormat";
import { cn } from "@/lib/utils";

const POLL_MS = 30000;

// Polls for the unread count rather than anything realtime -- there's no
// websocket/Realtime subscription wired up in this project, and a personal-
// scale app doesn't need one for "check every 30s" to feel reasonable.
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const count = await getUnreadNotificationCount();
      if (!cancelled) setUnread(count);
    }
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      const [data] = await Promise.all([listNotifications(), unread > 0 ? markAllNotificationsRead() : Promise.resolve()]);
      setItems(data);
      setLoading(false);
      setUnread(0);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-4.5 w-4.5" />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-2 w-2 rounded-full bg-red-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
          {loading && <p className="p-3 text-sm text-muted-foreground">Loading...</p>}
          {!loading && items && items.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">No notifications yet.</p>
          )}
          {!loading &&
            items?.map((n) => (
              <Link
                key={n.id}
                href={`/s/${n.saveId}`}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-start gap-2 rounded-md p-2 text-sm hover:bg-muted",
                  !n.read && "bg-muted/50"
                )}
              >
                <ProfileAvatar
                  avatarUrl={n.actor.avatarUrl}
                  label={n.actor.displayName || n.actor.username}
                  className="h-7 w-7 shrink-0 text-xs"
                />
                <span className="flex-1">
                  <span className="block">{describeNotification(n)}</span>
                  <span className="text-xs text-muted-foreground">{notificationTimeAgo(n.createdAt)}</span>
                </span>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}

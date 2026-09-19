import Link from "next/link";
import { Bell } from "lucide-react";
import { listNotifications, markAllNotificationsRead } from "@/lib/actions/notifications";
import { notificationTimeAgo, describeNotification } from "@/lib/notificationFormat";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";

// Full-page equivalent of the desktop header's NotificationBell dropdown --
// mobile's floating nav pill has no room for a positioned dropdown panel
// (see MobileNav.tsx), so its bell icon links here instead. Marks
// everything read on view, same as opening the dropdown does.
export default async function NotificationsPage() {
  const items = await listNotifications();
  await markAllNotificationsRead();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Notifications</h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-24 text-center text-muted-foreground">
          <Bell className="h-6 w-6" />
          <p className="max-w-sm text-sm">
            Nothing yet -- you&apos;ll see it here when someone likes or comments on one of your saves.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((n) => (
            <Link
              key={n.id}
              href={`/s/${n.saveId}`}
              className="flex items-start gap-3 rounded-lg p-3 text-sm hover:bg-muted"
            >
              <ProfileAvatar
                avatarUrl={n.actor.avatarUrl}
                label={n.actor.displayName || n.actor.username}
                className="h-9 w-9 shrink-0 text-sm"
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

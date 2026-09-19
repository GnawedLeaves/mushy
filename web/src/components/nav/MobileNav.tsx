"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Images, Compass, LayoutGrid, Search, Settings, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserSearch } from "@/components/search/UserSearch";
import { getUnreadNotificationCount } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";
import { useSectionPath } from "@/lib/useSectionPath";

const NOTIFICATION_POLL_MS = 30000;

const TABS = [
  { href: "/", label: "Gallery", icon: Images },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/boards", label: "Boards", icon: LayoutGrid },
];

// Floating bottom pill, mobile only (see AppShell -- hidden at the `sm`
// breakpoint and up, where the regular header nav takes over instead).
export function MobileNav() {
  const pathname = useSectionPath();
  const [searchOpen, setSearchOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const count = await getUnreadNotificationCount();
      if (!cancelled) setUnread(count);
    }
    poll();
    const interval = setInterval(poll, NOTIFICATION_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      {/* Floating top-right, separate from the bottom pill -- keeps
          notifications reachable with a thumb-friendly top corner tap
          instead of competing for space among the pill's other icons. */}
      <Link
        href="/notifications"
        aria-label="Notifications"
        className="fixed right-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border bg-card/90 text-muted-foreground shadow-lg backdrop-blur-md transition-colors hover:text-foreground sm:hidden"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500" />}
      </Link>

      <nav
        className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-fit items-center gap-1 rounded-full border bg-card/90 p-1.5 shadow-lg backdrop-blur-md sm:hidden"
        style={{ left: "50%", transform: "translateX(-50%)" }}
      >
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}

        <button
          aria-label="Search"
          onClick={() => setSearchOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
        >
          <Search className="h-5 w-5" />
        </button>

        <Link
          href="/settings"
          aria-label="Settings"
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full transition-colors",
            pathname === "/settings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Settings className="h-5 w-5" />
        </Link>
      </nav>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Find a user</DialogTitle>
          </DialogHeader>
          <UserSearch autoFocus onNavigate={() => setSearchOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

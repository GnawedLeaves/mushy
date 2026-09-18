"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Images, Compass, LayoutGrid, Search, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserSearch } from "@/components/search/UserSearch";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Gallery", icon: Images },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/boards", label: "Boards", icon: LayoutGrid },
];

// Floating bottom pill, mobile only (see AppShell -- hidden at the `sm`
// breakpoint and up, where the regular header nav takes over instead).
export function MobileNav() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-fit items-center gap-1 rounded-full border bg-card/90 p-1.5 shadow-lg backdrop-blur-md sm:hidden"
        style={{ left: "50%", transform: "translateX(-50%)" }}
      >
        {TABS.map((tab) => {
          const active = pathname === tab.href;
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

"use client";

import { type ReactNode } from "react";
import { AmbientGradient } from "@/components/fx/AmbientGradient";
import { MobileNav } from "@/components/nav/MobileNav";

export function AppShell({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <AmbientGradient />

      {/* Desktop nav. Hidden below `sm` -- MobileNav's floating bottom pill
          takes over there instead (see AppLayout for why: cramming this
          much into one bar was the mobile overflow bug).

          The frosted look used to come from NavGlass, a vitrio instance
          positioned with `position: fixed` and manually resynced only on
          resize (see git history) -- never on scroll. A `position: sticky`
          header rubber-bands with the page during elastic overscroll in
          WebKit, but a `position: fixed` element glued at a stale
          JS-computed offset doesn't move at all, so the two visibly
          separated: the nav text (real content of the sticky header)
          appeared to escape above its own backdrop. Plain CSS
          `backdrop-blur` lives *inside* the sticky element itself, so it's
          physically one unit with the header and can't desync from it. */}
      <header className="sticky top-0 z-20 hidden border-b bg-background/80 backdrop-blur-md sm:block">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">{nav}</div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28 sm:pb-6">{children}</main>

      <MobileNav />
    </div>
  );
}

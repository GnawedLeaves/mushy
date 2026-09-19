"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { AmbientGradient } from "@/components/fx/AmbientGradient";
import { MobileNav } from "@/components/nav/MobileNav";
import { PageTransition } from "@/components/fx/PageTransition";

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

      {/* pt-20 on mobile: MobileNav's floating notification bell
          (`fixed right-4 top-4`, 44px tall) sits on top of whatever's at the
          top of the page -- a plain `py-6` left just 24px of clearance, so a
          page's own top-right controls (e.g. Gallery's sort toggle) ended up
          partly hidden behind it. pb-28 does the same job at the bottom for
          the floating nav pill. */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-20 pb-28 sm:pt-6 sm:pb-6">
        <PageTransition>{children}</PageTransition>
      </main>

      {/* Not in the main nav -- it's already packed (see the comment above)
          -- but every page should still lead somewhere to it, both for
          users and for the Chrome Web Store listing's linked site. */}
      <footer className="hidden border-t px-4 py-4 text-center text-xs text-muted-foreground sm:block">
        <Link href="/privacy" className="hover:text-foreground">
          Privacy policy
        </Link>
      </footer>

      <MobileNav />
    </div>
  );
}

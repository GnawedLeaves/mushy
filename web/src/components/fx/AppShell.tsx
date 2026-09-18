"use client";

import { useRef, type ReactNode } from "react";
import { NavGlass } from "@/components/fx/NavGlass";
import { AmbientGradient } from "@/components/fx/AmbientGradient";
import { MobileNav } from "@/components/nav/MobileNav";

export function AppShell({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  const headerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen flex flex-col">
      <AmbientGradient />

      {/* Desktop nav. Hidden below `sm` -- MobileNav's floating bottom pill
          takes over there instead (see AppLayout for why: cramming this
          much into one bar was the mobile overflow bug). */}
      <header ref={headerRef} className="sticky top-0 z-20 hidden border-b border-transparent sm:block">
        <div className="relative z-10 mx-auto flex h-14 max-w-6xl items-center justify-between px-4">{nav}</div>
      </header>
      <NavGlass headerRef={headerRef} contentRef={mainRef} />

      <main ref={mainRef} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28 sm:pb-6">
        {children}
      </main>

      <MobileNav />
    </div>
  );
}

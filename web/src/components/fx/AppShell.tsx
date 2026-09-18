"use client";

import { useRef, type ReactNode } from "react";
import { NavGlass } from "@/components/fx/NavGlass";
import { AmbientGradient } from "@/components/fx/AmbientGradient";

export function AppShell({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  const headerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen flex flex-col">
      <AmbientGradient />
      <header ref={headerRef} className="sticky top-0 z-20 border-b border-transparent">
        <div className="relative z-10 mx-auto flex h-14 max-w-6xl items-center justify-between px-4">{nav}</div>
      </header>
      <NavGlass headerRef={headerRef} contentRef={mainRef} />
      <main ref={mainRef} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}

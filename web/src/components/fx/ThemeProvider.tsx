"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemePreference } from "@/lib/supabase/database.types";

// next-themes was already a dependency (shadcn's Sonner toast reads
// useTheme() to match its own colors) but nothing ever actually provided
// it -- so useTheme() was silently falling back to its no-op default and
// the app has only ever rendered in light mode, regardless of the `.dark`
// styles already sitting in globals.css or the system's own preference.
// `attribute="class"` toggles the same `.dark` class on <html> that
// globals.css's `@custom-variant dark (&:is(.dark *))` expects.
//
// `defaultTheme` is the signed-in user's saved profiles.theme (passed down
// from the root layout, which reads it server-side) -- next-themes only
// ever falls back to this when the current browser has no theme of its own
// in localStorage yet, e.g. a fresh browser or a first-time device. Once
// this browser has a stored preference (from a manual toggle, here or
// elsewhere), that local value wins on every later visit; there's no
// realtime sync pulling in changes made from a different device after the
// fact, only this one "seed from the account" moment.
export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode;
  defaultTheme?: ThemePreference;
}) {
  return (
    <NextThemesProvider attribute="class" defaultTheme={defaultTheme} enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}

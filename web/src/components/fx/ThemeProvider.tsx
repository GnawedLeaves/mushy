"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes was already a dependency (shadcn's Sonner toast reads
// useTheme() to match its own colors) but nothing ever actually provided
// it -- so useTheme() was silently falling back to its no-op default and
// the app has only ever rendered in light mode, regardless of the `.dark`
// styles already sitting in globals.css or the system's own preference.
// `attribute="class"` toggles the same `.dark` class on <html> that
// globals.css's `@custom-variant dark (&:is(.dark *))` expects.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}

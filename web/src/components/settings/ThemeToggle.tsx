"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // next-themes only knows the real theme after mounting client-side (the
  // server has no concept of the visitor's stored preference) -- rendering
  // the selected state before that would either flash the wrong option or
  // mismatch the server-rendered HTML, so this waits one tick rather than
  // trusting `theme` on the very first render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Deferred a tick so this isn't a setState called directly inside the
    // effect body (react-hooks/set-state-in-effect) -- same pattern as
    // lib/useSectionPath.ts.
    queueMicrotask(() => setMounted(true));
  }, []);

  return (
    <div className="flex gap-1 rounded-md border p-1 text-sm">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = mounted && theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1.5",
              active ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

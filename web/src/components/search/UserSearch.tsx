"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchProfiles, type ProfileSearchResult } from "@/lib/actions/search";

const DEBOUNCE_MS = 1000;

export function UserSearch({ onNavigate, autoFocus }: { onNavigate?: () => void; autoFocus?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    // The <2-char case is handled synchronously in handleChange below, not
    // here -- an effect should set up a subscription/timer, not assign
    // state synchronously on run (react-hooks/set-state-in-effect). Every
    // setState in this effect lives inside the timeout's callback instead.
    if (trimmed.length < 2) return;

    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      const data = await searchProfiles(trimmed);
      // Ignore stale responses from a since-superseded query.
      if (requestId === requestIdRef.current) {
        setResults(data);
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleChange(value: string) {
    setQuery(value);
    // Show the skeleton immediately on keystroke rather than only once the
    // debounced fetch actually starts -- this runs in the input's own
    // change handler, not an effect, so setState here is the normal case.
    if (value.trim().length < 2) {
      setResults(null);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }

  const showDropdown = query.trim().length >= 2;

  function handleSelect() {
    // Clearing the query (not just calling onNavigate) is what actually
    // closes the dropdown -- it stays visible purely based on query length,
    // and the layout this lives in persists across route changes, so
    // without this the results list was still sitting open after the click
    // navigated away.
    setQuery("");
    setResults(null);
    onNavigate?.();
  }

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Find a user..."
          autoFocus={autoFocus}
          className="pl-8"
        />
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
          {loading && (
            <div className="space-y-1 p-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2 rounded-md p-2">
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          )}

          {!loading && results && results.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">No users found.</p>
          )}

          {!loading &&
            results?.map((profile) => (
              <Link
                key={profile.username}
                href={`/u/${profile.username}`}
                onClick={handleSelect}
                className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-muted"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <User className="h-4 w-4" />
                </span>
                <span className="flex flex-col">
                  <span className="font-medium">{profile.display_name || `@${profile.username}`}</span>
                  <span className="text-xs text-muted-foreground">@{profile.username}</span>
                </span>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}

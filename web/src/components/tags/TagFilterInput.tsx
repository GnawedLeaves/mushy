"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SUGGEST_DEBOUNCE_MS = 250;

// Shared by Gallery search, Discover's mobile masonry grid, and Discover's
// desktop Dome Gallery -- generated tags are often specific multi-word
// phrases ("cassette futurism", "mecha aesthetic"), unrealistic to type
// from memory, so this offers autocomplete from tags actually in use
// (via `suggest`) and lets several be picked at once as removable chips.
// The caller ORs them together (an `.overlaps()` query, not `.contains()`).
export function TagFilterInput({
  tags,
  onChange,
  suggest,
  placeholder = "Filter by tag...",
  className,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggest: (query: string) => Promise<string[]>;
  placeholder?: string;
  className?: string;
}) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      const results = await suggest(input);
      if (requestId !== requestIdRef.current) return;
      setSuggestions(results.filter((t) => !tags.includes(t)));
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, suggest]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function addTag(tag: string) {
    const clean = tag.trim().toLowerCase();
    if (!clean || tags.includes(clean)) return;
    onChange([...tags, clean]);
    setInput("");
    setOpen(false);
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-3.5 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
          >
            {tag}
            <button type="button" aria-label={`Remove ${tag}`} onClick={() => removeTag(tag)}>
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          </span>
        ))}
        <Input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          // dark:bg-transparent has to be explicit, not just bg-transparent --
          // the base Input component's own dark:bg-input/30 is a *scoped*
          // (dark-variant) class, not a plain conflicting one, so
          // tailwind-merge doesn't treat an unprefixed bg-transparent as
          // overriding it. Without this, dark mode showed a faint rectangle
          // where the input's own background peeked through against this
          // wrapper's.
          className="h-6 min-w-[100px] flex-1 border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

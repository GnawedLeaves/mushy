"use server";

import { createClient } from "@/lib/supabase/server";

export interface ProfileSearchResult {
  username: string;
  display_name: string | null;
}

// RLS ("profiles: read own or public") already restricts this to public
// profiles (or the caller's own), so no extra is_private filter is needed
// here -- a private profile's row simply isn't visible to query against.
export async function searchProfiles(query: string): Promise<ProfileSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const supabase = await createClient();
  const pattern = `%${trimmed}%`;

  // Two plain .ilike() calls instead of building a single .or(...) filter
  // string by hand -- PostgREST's .or() syntax treats commas/parens in the
  // value as filter-grammar tokens, so a search query containing either
  // would need careful quoting to not break the query. Each .ilike() call
  // instead passes its value through the query builder normally, which
  // encodes it safely regardless of content.
  const [byUsername, byDisplayName] = await Promise.all([
    supabase.from("profiles").select("username, display_name").ilike("username", pattern).limit(8),
    supabase.from("profiles").select("username, display_name").ilike("display_name", pattern).limit(8),
  ]);

  const seen = new Set<string>();
  const results: ProfileSearchResult[] = [];
  for (const row of [...(byUsername.data ?? []), ...(byDisplayName.data ?? [])]) {
    if (seen.has(row.username)) continue;
    seen.add(row.username);
    results.push(row);
  }

  return results.slice(0, 8);
}

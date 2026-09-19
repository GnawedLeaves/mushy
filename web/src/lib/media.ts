import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SIGNED_URL_TTL_SECONDS = 60 * 60;
// Comfortably under the signed URL's own TTL, so every cache hit still
// returns a URL with real time left on it rather than one that's already
// (or nearly) expired.
const SIGNED_URL_CACHE_SECONDS = 55 * 60;

// unstable_cache's callback can't call cookies() (Next throws if it does),
// so this can't use the normal RLS-scoped client -- it signs with the
// admin/service-role client instead. That's safe specifically because every
// caller below only ever passes a storage_path that came from a `saves` row
// an RLS-scoped query *already* returned (see the comment on
// getSignedMediaUrl) -- signing doesn't make a new authorization decision,
// it's a mechanical step for a path that's already been cleared. Caching
// this is what actually cuts gallery/discover load time: without it, a
// media-heavy grid re-signs every visible file on every single page visit
// and every navigation back to a page you'd just seen, even though a
// signed URL is already good for a full hour. Note: per Next's own docs,
// unstable_cache never caches anything in `next dev` -- only in a
// production build (`next build` + deploy), so this won't show a speedup
// locally.
const getCachedSignedUrl = unstable_cache(
  async (storagePath: string): Promise<string | null> => {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from("media").createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    if (error || !data) return null;
    return data.signedUrl;
  },
  ["signed-media-url"],
  { revalidate: SIGNED_URL_CACHE_SECONDS }
);

// Server Component helper (not a Server Action): the "media" bucket is
// private, so rendering a save needs a signed URL. Call this only after an
// RLS-scoped query already returned the `saves` row -- if RLS denied the
// row, there's no storage_path to sign in the first place, which is the
// point (see Notion "Mushy" doc, RLS section).
export async function getSignedMediaUrl(storagePath: string): Promise<string | null> {
  return getCachedSignedUrl(storagePath);
}

export async function getSignedMediaUrls(storagePaths: string[]): Promise<Record<string, string>> {
  if (storagePaths.length === 0) return {};

  const entries = await Promise.all(
    storagePaths.map(async (path) => [path, await getCachedSignedUrl(path)] as const)
  );

  const result: Record<string, string> = {};
  for (const [path, url] of entries) {
    if (url) result[path] = url;
  }
  return result;
}

// The "avatars" bucket is public, so no signing needed -- just the public
// URL. `cacheBustKey` (pass the profile's `updated_at`) is appended as a
// query param because avatars always upload to the same fixed storage key
// (see uploadAvatar in lib/actions/profile.ts), so the URL itself never
// changes when someone replaces their avatar; without a cache-buster the
// browser (and any CDN in front of Storage) would keep serving the old
// image indefinitely.
export async function getAvatarUrl(avatarPath: string | null, cacheBustKey?: string | null): Promise<string | null> {
  if (!avatarPath) return null;
  const supabase = await createClient();
  const { data } = supabase.storage.from("avatars").getPublicUrl(avatarPath);
  if (!data.publicUrl) return null;
  return cacheBustKey ? `${data.publicUrl}?v=${encodeURIComponent(cacheBustKey)}` : data.publicUrl;
}

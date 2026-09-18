import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

// Server Component helper (not a Server Action): the "media" bucket is
// private, so rendering a save needs a signed URL. Call this only after an
// RLS-scoped query already returned the `saves` row -- if RLS denied the
// row, there's no storage_path to sign in the first place, which is the
// point (see Notion "Mushy" doc, RLS section).
export async function getSignedMediaUrl(storagePath: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("media")
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data) return null;
  return data.signedUrl;
}

export async function getSignedMediaUrls(storagePaths: string[]): Promise<Record<string, string>> {
  if (storagePaths.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("media")
    .createSignedUrls(storagePaths, SIGNED_URL_TTL_SECONDS);

  if (error || !data) return {};

  const result: Record<string, string> = {};
  for (const item of data) {
    if (item.signedUrl && item.path) result[item.path] = item.signedUrl;
  }
  return result;
}

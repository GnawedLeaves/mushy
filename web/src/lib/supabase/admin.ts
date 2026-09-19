import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";
import type { Database } from "./database.types";

// Service-role client: bypasses RLS entirely. Server-only -- never import
// this from a Client Component, and never read SUPABASE_SERVICE_ROLE_KEY
// outside this file. Used by the extension API routes (which authenticate
// via bearer token, not a Supabase session), the PAT Server Action, and
// lib/media.ts's cached signed-URL helper (unstable_cache's callback can't
// use cookies(), so it can't use the normal RLS-scoped client -- see that
// file's own comment for why that's still safe there).
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in the server environment.");
  }

  return createSupabaseClient<Database>(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

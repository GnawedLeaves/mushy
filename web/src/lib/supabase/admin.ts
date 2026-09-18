import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";
import type { Database } from "./database.types";

// Service-role client: bypasses RLS entirely. Server-only -- never import
// this from a Client Component, and never read SUPABASE_SERVICE_ROLE_KEY
// outside this file. Used only by the extension API routes (which
// authenticate via bearer token, not a Supabase session) and by the PAT
// Server Action.
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in the server environment.");
  }

  return createSupabaseClient<Database>(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

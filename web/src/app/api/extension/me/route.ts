import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/auth/verifyExtensionToken";
import { createAdminClient } from "@/lib/supabase/admin";
import { withCors, CORS_HEADERS } from "@/lib/extension/cors";

// The extension's options page runs as a chrome-extension:// origin, which
// is cross-origin from wherever this API is deployed -- the browser sends
// a CORS preflight before the real GET (Authorization is not a
// CORS-safelisted header), so OPTIONS must answer or the real request
// never fires. See lib/extension/cors.ts for why `*` is safe here.
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  try {
    const auth = await verifyExtensionToken(request);
    if (!auth) {
      return withCors(NextResponse.json({ error: "Invalid or revoked token." }, { status: 401 }));
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("username, display_name")
      .eq("id", auth.userId)
      .maybeSingle();

    return withCors(
      NextResponse.json({
        username: profile?.username ?? null,
        displayName: profile?.display_name ?? null,
      })
    );
  } catch (err) {
    // Surfaced as JSON (not Next's default error page) so the extension's
    // "test connection" can show the real cause -- almost always a missing
    // SUPABASE_SERVICE_ROLE_KEY, not a bad token.
    const message = err instanceof Error ? err.message : "Unknown server error.";
    return withCors(NextResponse.json({ error: `Server misconfigured: ${message}` }, { status: 500 }));
  }
}

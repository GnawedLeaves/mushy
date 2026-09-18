import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/auth/verifyExtensionToken";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const auth = await verifyExtensionToken(request);
    if (!auth) {
      return NextResponse.json({ error: "Invalid or revoked token." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("username, display_name")
      .eq("id", auth.userId)
      .maybeSingle();

    return NextResponse.json({
      username: profile?.username ?? null,
      displayName: profile?.display_name ?? null,
    });
  } catch (err) {
    // Surfaced as JSON (not Next's default error page) so the extension's
    // "test connection" can show the real cause -- almost always a missing
    // SUPABASE_SERVICE_ROLE_KEY, not a bad token.
    const message = err instanceof Error ? err.message : "Unknown server error.";
    return NextResponse.json({ error: `Server misconfigured: ${message}` }, { status: 500 });
  }
}

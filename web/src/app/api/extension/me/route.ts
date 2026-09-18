import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/auth/verifyExtensionToken";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
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
}

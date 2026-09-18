import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function verifyExtensionToken(
  request: Request
): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("personal_access_tokens")
    .select("id, user_id, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data || data.revoked_at) {
    return null;
  }

  await admin
    .from("personal_access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { userId: data.user_id };
}

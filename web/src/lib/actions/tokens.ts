"use server";

import { randomBytes, createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Plaintext is returned once, here, and never stored -- only its sha256 hash
// lives in the DB (see verifyExtensionToken.ts for the lookup side). RLS
// ("pat: owner only", `for all using/with check (user_id = auth.uid())`)
// already lets the session-scoped client insert its own row, so no admin
// client is needed here.
export async function generateToken(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const plaintext = `mushy_pat_${randomBytes(32).toString("base64url")}`;
  const tokenHash = createHash("sha256").update(plaintext).digest("hex");

  const { error } = await supabase.from("personal_access_tokens").insert({
    user_id: user.id,
    token_hash: tokenHash,
    name: name || "Browser Extension",
  });

  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  return { token: plaintext };
}

export async function revokeToken(tokenId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("personal_access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}

export async function listTokens() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Revoked tokens are excluded here, not just hidden in the UI -- without
  // this, every "Generate" + "Revoke" cycle left a dead row that kept
  // showing up on every future page load, so the list only ever grew. The
  // row itself isn't deleted (still useful as an audit trail of past
  // tokens), it just isn't returned to a page that only ever wants to show
  // the ones you could currently use.
  const { data, error } = await supabase
    .from("personal_access_tokens")
    .select("id, name, last_used_at, created_at, revoked_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

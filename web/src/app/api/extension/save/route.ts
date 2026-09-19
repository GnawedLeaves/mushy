import { randomUUID } from "crypto";
import { NextResponse, after } from "next/server";
import { verifyExtensionToken } from "@/lib/auth/verifyExtensionToken";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAndValidateMedia, MediaFetchError } from "@/lib/extension/mediaFetch";
import { generateAestheticTags } from "@/lib/ai/aestheticTags";
import { positionAtEnd } from "@/lib/reorder";
import { withCors, CORS_HEADERS } from "@/lib/extension/cors";
import { SAVE_CAPTION_MAX } from "@/lib/limits";

interface SavePayload {
  mediaUrl: string;
  sourceUrl: string;
  sourceTitle?: string;
  caption?: unknown;
}

// Same "trust nothing from the client" stance as sanitizing tags would need
// -- caption is optional, client-supplied text from the extension's own
// on-page prompt (see extension/src/background.ts's injectCaptionPrompt),
// so it's trimmed and capped server-side too, not just via the input's own
// maxLength on the extension side.
function sanitizeCaption(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, SAVE_CAPTION_MAX);
  return trimmed.length > 0 ? trimmed : null;
}

// See me/route.ts for why OPTIONS needs to answer explicitly here too.
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  let auth;
  try {
    auth = await verifyExtensionToken(request);
  } catch (err) {
    // e.g. SUPABASE_SERVICE_ROLE_KEY missing -- a server misconfiguration,
    // not a bad token, so this must not look like a 401 to the extension.
    const message = err instanceof Error ? err.message : "Unknown server error.";
    return withCors(NextResponse.json({ error: `Server misconfigured: ${message}` }, { status: 500 }));
  }

  if (!auth) {
    return withCors(NextResponse.json({ error: "Invalid or revoked token." }, { status: 401 }));
  }

  let payload: SavePayload;
  try {
    payload = await request.json();
  } catch {
    return withCors(NextResponse.json({ error: "Malformed JSON body." }, { status: 400 }));
  }

  if (!payload.mediaUrl || !payload.sourceUrl) {
    return withCors(NextResponse.json({ error: "mediaUrl and sourceUrl are required." }, { status: 400 }));
  }

  let media;
  try {
    media = await fetchAndValidateMedia(payload.mediaUrl);
  } catch (err) {
    if (err instanceof MediaFetchError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 422 }));
    }
    return withCors(NextResponse.json({ error: "Unexpected error fetching media." }, { status: 500 }));
  }

  const admin = createAdminClient();
  const saveId = randomUUID();
  const storagePath = `${auth.userId}/${saveId}.${media.ext}`;

  const { error: uploadError } = await admin.storage.from("media").upload(storagePath, media.buffer, {
    contentType: media.mimeType,
    upsert: false,
  });
  if (uploadError) {
    return withCors(NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 }));
  }

  const { data: maxRow } = await admin
    .from("saves")
    .select("position")
    .eq("owner_id", auth.userId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: insertError } = await admin.from("saves").insert({
    id: saveId,
    owner_id: auth.userId,
    storage_path: storagePath,
    media_type: media.mediaType,
    mime_type: media.mimeType,
    file_size_bytes: media.buffer.byteLength,
    width: media.width,
    height: media.height,
    source_url: payload.sourceUrl,
    source_title: payload.sourceTitle ?? null,
    caption: sanitizeCaption(payload.caption),
    position: positionAtEnd(maxRow?.position ?? null),
  });

  if (insertError) {
    // Don't leave an orphaned file if the row insert fails -- best-effort,
    // skip on failure, no partial saves (per the agreed v1 scope).
    await admin.storage.from("media").remove([storagePath]);
    return withCors(NextResponse.json({ error: insertError.message }, { status: 500 }));
  }

  // Tagging happens after the response is already on its way back to the
  // extension -- the save itself doesn't wait on a Gemini round-trip. media
  // is still in memory from the fetch above, so this doesn't re-download
  // anything. Best-effort: on any failure (no key, timeout, bad response)
  // generateAestheticTags resolves to [], and a save just stays untagged.
  after(async () => {
    const tags = await generateAestheticTags(media.buffer, media.mimeType);
    if (tags.length > 0) {
      await admin.from("saves").update({ tags }).eq("id", saveId);
    }
  });

  return withCors(NextResponse.json({ id: saveId }, { status: 201 }));
}

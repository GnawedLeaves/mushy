import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/auth/verifyExtensionToken";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAndValidateMedia, MediaFetchError } from "@/lib/extension/mediaFetch";
import { positionAtEnd } from "@/lib/reorder";
import { withCors, CORS_HEADERS } from "@/lib/extension/cors";

interface SavePayload {
  mediaUrl: string;
  sourceUrl: string;
  sourceTitle?: string;
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
    position: positionAtEnd(maxRow?.position ?? null),
  });

  if (insertError) {
    // Don't leave an orphaned file if the row insert fails -- best-effort,
    // skip on failure, no partial saves (per the agreed v1 scope).
    await admin.storage.from("media").remove([storagePath]);
    return withCors(NextResponse.json({ error: insertError.message }, { status: 500 }));
  }

  return withCors(NextResponse.json({ id: saveId }, { status: 201 }));
}

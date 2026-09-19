import probe from "probe-image-size";
import type { MediaType } from "@/lib/supabase/database.types";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_BYTES = 30 * 1024 * 1024; // 30MB

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

const MIME_TO_MEDIA_TYPE: Record<string, MediaType> = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "image/gif": "gif",
  "video/mp4": "video",
  "video/webm": "video",
};

const EXT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
};

function extFromUrl(url: string): string | null {
  const match = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(new URL(url).pathname);
  return match ? match[1].toLowerCase() : null;
}

export interface FetchedMedia {
  buffer: Buffer;
  mimeType: string;
  mediaType: MediaType;
  ext: string;
  width: number | null;
  height: number | null;
}

export class MediaFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaFetchError";
  }
}

function finalizeMedia(buffer: Buffer, mimeType: string): FetchedMedia {
  if (!MIME_TO_EXT[mimeType]) {
    throw new MediaFetchError(`Unsupported media type: ${mimeType || "unknown"}.`);
  }

  const mediaType = MIME_TO_MEDIA_TYPE[mimeType];
  const maxBytes = mediaType === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (buffer.byteLength > maxBytes) {
    throw new MediaFetchError(`File too large (${Math.round(buffer.byteLength / 1024 / 1024)}MB).`);
  }

  let width: number | null = null;
  let height: number | null = null;
  if (mediaType === "image" || mediaType === "gif") {
    try {
      const dimensions = probe.sync(buffer);
      if (dimensions) {
        width = dimensions.width;
        height = dimensions.height;
      }
    } catch {
      // Dimension probing is best-effort -- a save with null width/height
      // still renders fine, just without a reserved aspect-ratio box.
    }
  }

  return { buffer, mimeType, mediaType, ext: MIME_TO_EXT[mimeType], width, height };
}

const DATA_URL_PATTERN = /^data:([^;,]+)?(;charset=[^;,]+)?(;base64)?,([\s\S]*)$/;

// The extension's element-capture flow (screenshot a <canvas> chart or any
// other DOM node with no fetchable src -- see extension/src/content.ts) has
// no URL to send at all, just the cropped PNG itself, so it's sent as a data:
// URL instead. Decoded directly here rather than round-tripped through
// fetch() -- avoids depending on the Node fetch implementation's own data:
// URL support, and skips a pointless network-stack detour for bytes that are
// already in the request body.
function decodeDataUrl(dataUrl: string): FetchedMedia {
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) throw new MediaFetchError("Malformed data URL.");
  const mimeType = (match[1] || "application/octet-stream").toLowerCase();
  const isBase64 = !!match[3];
  const encoded = match[4];
  const buffer = isBase64 ? Buffer.from(encoded, "base64") : Buffer.from(decodeURIComponent(encoded), "utf-8");
  return finalizeMedia(buffer, mimeType);
}

export async function fetchAndValidateMedia(mediaUrl: string): Promise<FetchedMedia> {
  if (mediaUrl.startsWith("data:")) {
    return decodeDataUrl(mediaUrl);
  }

  let response: Response;
  try {
    response = await fetch(mediaUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });
  } catch {
    throw new MediaFetchError("Could not reach that media URL (timed out or blocked).");
  }

  if (!response.ok) {
    throw new MediaFetchError(`Media host responded with ${response.status}.`);
  }

  let mimeType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  if (!MIME_TO_EXT[mimeType]) {
    const ext = extFromUrl(mediaUrl);
    mimeType = (ext && EXT_TO_MIME[ext]) || mimeType;
  }
  if (!MIME_TO_EXT[mimeType]) {
    throw new MediaFetchError(`Unsupported media type: ${mimeType || "unknown"}.`);
  }

  const maxBytes = MIME_TO_MEDIA_TYPE[mimeType] === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) {
    throw new MediaFetchError(`File too large (${Math.round(contentLength / 1024 / 1024)}MB).`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return finalizeMedia(Buffer.from(arrayBuffer), mimeType);
}

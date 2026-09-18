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

export async function fetchAndValidateMedia(mediaUrl: string): Promise<FetchedMedia> {
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

  const mediaType = MIME_TO_MEDIA_TYPE[mimeType];
  const maxBytes = mediaType === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) {
    throw new MediaFetchError(`File too large (${Math.round(contentLength / 1024 / 1024)}MB).`);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > maxBytes) {
    throw new MediaFetchError(`File too large (${Math.round(arrayBuffer.byteLength / 1024 / 1024)}MB).`);
  }

  const buffer = Buffer.from(arrayBuffer);

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

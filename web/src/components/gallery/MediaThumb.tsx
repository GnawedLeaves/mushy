import { ImageOff } from "lucide-react";
import type { MediaType } from "@/lib/supabase/database.types";

// Shared media-or-fallback renderer -- one visual for "this save's signed
// URL didn't resolve" instead of silently rendering an empty box, used
// everywhere a save's media shows up (gallery, boards, public profiles).
export function MediaThumb({
  mediaUrl,
  mediaType,
  alt,
  width,
  height,
  className,
  videoProps,
}: {
  mediaUrl: string | null;
  mediaType: MediaType;
  alt: string;
  width?: number | null;
  height?: number | null;
  className?: string;
  videoProps?: React.VideoHTMLAttributes<HTMLVideoElement>;
}) {
  if (!mediaUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-muted text-muted-foreground ${className ?? "aspect-square w-full"}`}
      >
        <ImageOff className="h-6 w-6" />
      </div>
    );
  }

  if (mediaType === "video") {
    return (
      <video
        src={mediaUrl}
        className={className ?? "w-full"}
        style={width && height ? { aspectRatio: `${width} / ${height}` } : undefined}
        muted
        loop
        playsInline
        {...videoProps}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mediaUrl}
      alt={alt}
      className={className ?? "w-full"}
      style={width && height ? { aspectRatio: `${width} / ${height}` } : undefined}
      loading="lazy"
    />
  );
}

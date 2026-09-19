"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { uploadAvatar } from "@/lib/actions/profile";

export function AvatarUploadForm({
  initialAvatarUrl,
  label,
}: {
  initialAvatarUrl: string | null;
  label: string;
}) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show the picked file immediately via a local object URL while the
    // upload is in flight, instead of waiting on the round trip.
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    const formData = new FormData();
    formData.set("avatar", file);
    setPending(true);
    uploadAvatar(formData)
      .then((result) => {
        if (result.error) {
          toast.error(result.error);
          setPreviewUrl(null);
        } else {
          toast.success("Profile picture updated.");
          setAvatarUrl(localPreview);
        }
      })
      .catch(() => {
        toast.error("Could not upload image.");
        setPreviewUrl(null);
      })
      .finally(() => {
        setPending(false);
        URL.revokeObjectURL(localPreview);
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
  }

  return (
    <div className="flex items-center gap-4">
      <ProfileAvatar avatarUrl={previewUrl ?? avatarUrl} label={label} className="h-16 w-16 text-xl" />
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => fileInputRef.current?.click()}
        >
          {pending ? "Uploading..." : "Change photo"}
        </Button>
        <p className="mt-1 text-xs text-muted-foreground">PNG, JPEG, or WebP. Up to 5MB.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}

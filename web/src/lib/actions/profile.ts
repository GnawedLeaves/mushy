"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { USERNAME_MAX, DISPLAY_NAME_MAX, BIO_MAX } from "@/lib/limits";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const username = String(formData.get("username") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (!new RegExp(`^[a-z0-9_]{3,${USERNAME_MAX}}$`).test(username)) {
    return { error: `Username must be 3-${USERNAME_MAX} characters: lowercase letters, numbers, underscores.` };
  }
  if (displayName.length > DISPLAY_NAME_MAX) {
    return { error: `Display name must be ${DISPLAY_NAME_MAX} characters or fewer.` };
  }
  if (bio.length > BIO_MAX) {
    return { error: `Bio must be ${BIO_MAX} characters or fewer.` };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      display_name: displayName || null,
      bio: bio || null,
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message.includes("duplicate") ? "That username is taken." : error.message };
  }

  revalidatePath("/settings");
  revalidatePath(`/u/${username}`);
  return { error: null };
}

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_ALLOWED_TYPES: Record<string, true> = {
  "image/png": true,
  "image/jpeg": true,
  "image/webp": true,
};

export async function uploadAvatar(formData: FormData): Promise<{ error: string | null; avatarPath?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image first." };
  }
  if (!AVATAR_ALLOWED_TYPES[file.type]) {
    return { error: "Use a PNG, JPEG, or WebP image." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { error: "Image must be 5MB or smaller." };
  }

  // Always the same key (no extension) and always upsert -- one canonical
  // slot per user regardless of what format they upload this time, so
  // switching from a .png to a .jpg avatar never leaves the old file behind
  // as storage debris. The actual Content-Type comes from the `contentType`
  // option below, not the (extension-less) filename, so browsers still
  // render it correctly.
  const path = `${user.id}/avatar`;

  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (uploadError) return { error: uploadError.message };

  const { error: dbError } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
  if (dbError) return { error: dbError.message };

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();

  revalidatePath("/settings");
  if (profile?.username) revalidatePath(`/u/${profile.username}`);
  return { error: null, avatarPath: path };
}

export async function setProfilePrivacy(isPrivate: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("profiles")
    .update({ is_private: isPrivate })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/");
}

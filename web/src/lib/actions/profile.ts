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

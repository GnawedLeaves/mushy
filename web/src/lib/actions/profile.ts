"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const username = String(formData.get("username") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    return { error: "Username must be 3-30 characters: lowercase letters, numbers, underscores." };
  }
  if (displayName.length > 50) {
    return { error: "Display name must be 50 characters or fewer." };
  }
  if (bio.length > 280) {
    return { error: "Bio must be 280 characters or fewer." };
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

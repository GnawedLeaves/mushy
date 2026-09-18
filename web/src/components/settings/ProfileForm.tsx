"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { updateProfile, setProfilePrivacy } from "@/lib/actions/profile";
import type { Database } from "@/lib/supabase/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function ProfileForm({ profile }: { profile: Profile }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [isPrivate, setIsPrivate] = useState(profile.is_private);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await updateProfile(formData);
    setPending(false);
    if (result?.error) setError(result.error);
    else setSaved(true);
  }

  function togglePrivacy(next: boolean) {
    setIsPrivate(next);
    setProfilePrivacy(next).catch(() => setIsPrivate(!next));
  }

  return (
    <div className="space-y-6">
      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" defaultValue={profile.username} required pattern="[a-z0-9_]{3,30}" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input id="displayName" name="displayName" defaultValue={profile.display_name ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} rows={3} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && <p className="text-sm text-muted-foreground">Saved.</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save profile"}
        </Button>
      </form>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Private profile</p>
          <p className="text-sm text-muted-foreground">
            Hide your profile, boards, and saves from everyone but you.
          </p>
        </div>
        <Switch checked={isPrivate} onCheckedChange={togglePrivacy} />
      </div>
    </div>
  );
}

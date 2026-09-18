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

const USERNAME_MAX = 30;
const DISPLAY_NAME_MAX = 50;
const BIO_MAX = 280;

export function ProfileForm({ profile }: { profile: Profile }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [isPrivate, setIsPrivate] = useState(profile.is_private);
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");

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
          <Input
            id="username"
            name="username"
            defaultValue={profile.username}
            required
            pattern="[a-z0-9_]{3,30}"
            maxLength={USERNAME_MAX}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="displayName">Display name</Label>
            <span className="text-xs text-muted-foreground">
              {displayName.length}/{DISPLAY_NAME_MAX}
            </span>
          </div>
          <Input
            id="displayName"
            name="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={DISPLAY_NAME_MAX}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="bio">Bio</Label>
            <span className="text-xs text-muted-foreground">
              {bio.length}/{BIO_MAX}
            </span>
          </div>
          <Textarea
            id="bio"
            name="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={BIO_MAX}
          />
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

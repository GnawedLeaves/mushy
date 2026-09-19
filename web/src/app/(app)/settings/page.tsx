import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listTokens } from "@/lib/actions/tokens";
import { signOut } from "@/lib/actions/auth";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { AvatarUploadForm } from "@/components/settings/AvatarUploadForm";
import { TokenManager } from "@/components/settings/TokenManager";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { getAvatarUrl } from "@/lib/media";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const tokens = await listTokens();
  const avatarUrl = profile ? await getAvatarUrl(profile.avatar_path, profile.updated_at) : null;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Profile</h2>
          {profile && (
            // Mobile has no header nav (the floating bottom bar is icon-only
            // and doesn't have room for a profile tab), so this is the way
            // in to your own public profile there.
            <Link
              href={`/u/${profile.username}`}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              View your profile
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        {profile && (
          <>
            <AvatarUploadForm initialAvatarUrl={avatarUrl} label={profile.display_name || profile.username} />
            <ProfileForm profile={profile} />
          </>
        )}
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">Appearance</h2>
        <ThemeToggle />
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Browser extension</h2>
          <Link href="/help" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            Help installing it
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
        <TokenManager initialTokens={tokens} />
      </section>

      <Separator />

      {/* Also reachable here (not just the desktop header's nav) so it's
          available on mobile, where the header nav is replaced by the
          floating bottom bar. */}
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Log out
        </Button>
      </form>
    </div>
  );
}

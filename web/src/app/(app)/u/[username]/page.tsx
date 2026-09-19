import { PublicProfileGrid } from "@/components/profile/PublicProfileGrid";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { BackButton } from "@/components/nav/BackButton";
import { getAvatarUrl, getSignedMediaUrls } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";
import type { SaveWithUrl } from "@/lib/types";
import { Images, Lock } from "lucide-react";
import Link from "next/link";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();

  if (!profile) {
    return <p className="text-muted-foreground">This profile doesn&apos;t exist, or is private.</p>;
  }

  const isOwner = viewer?.id === profile.id;

  const [{ data: boards }, { data: saves }] = await Promise.all([
    supabase
      .from("boards")
      .select("id, title, is_private")
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("saves")
      .select("*")
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const urlMap = await getSignedMediaUrls((saves ?? []).map((s) => s.storage_path));
  const savesWithUrls: SaveWithUrl[] = (saves ?? []).map((s) => ({ ...s, mediaUrl: urlMap[s.storage_path] ?? null }));
  const avatarUrl = await getAvatarUrl(profile.avatar_path, profile.updated_at);

  return (
    <div>
      <BackButton className="mb-4" />
      <div className="mb-10 flex flex-wrap items-start justify-between gap-4 rounded-2xl border bg-card/80 p-6 shadow-sm backdrop-blur-md">
        <div className="flex items-start gap-4">
          <ProfileAvatar avatarUrl={avatarUrl} label={profile.display_name || profile.username} />
          <div>
            <h1 className="text-2xl font-semibold">{profile.display_name || `@${profile.username}`}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            {profile.bio && <p className="mt-2 max-w-md text-sm">{profile.bio}</p>}
          </div>
        </div>
        {!isOwner && !viewer && (
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Log in
          </Link>
        )}
      </div>

      {boards && boards.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Boards</h2>
          <div className="flex flex-wrap gap-2">
            {boards.map((board) => (
              <Link
                key={board.id}
                href={`/boards/${board.id}`}
                className="flex items-center gap-1 rounded-full border bg-card/80 px-3 py-1 text-sm shadow-sm backdrop-blur-md hover:bg-muted"
              >
                {board.is_private && <Lock className="h-3 w-3" />}
                {board.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Saves</h2>
        {savesWithUrls.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-24 text-center text-muted-foreground">
            <Images className="h-6 w-6" />
            <p className="text-sm">Nothing public here yet.</p>
          </div>
        ) : (
          <PublicProfileGrid saves={savesWithUrls} />
        )}
      </section>
    </div>
  );
}

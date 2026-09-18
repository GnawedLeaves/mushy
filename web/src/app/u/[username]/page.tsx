import Link from "next/link";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSignedMediaUrls } from "@/lib/media";
import type { SaveWithUrl } from "@/lib/types";

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
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">This profile doesn&apos;t exist, or is private.</p>
      </main>
    );
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{profile.display_name || `@${profile.username}`}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="mt-2 max-w-md text-sm">{profile.bio}</p>}
        </div>
        <Link href={isOwner ? "/" : "/login"} className="text-sm text-muted-foreground hover:text-foreground">
          {isOwner ? "Back to your gallery" : "Log in"}
        </Link>
      </div>

      {boards && boards.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Boards</h2>
          <div className="flex flex-wrap gap-2">
            {boards.map((board) => (
              <Link
                key={board.id}
                href={`/boards/${board.id}`}
                className="flex items-center gap-1 rounded-full border px-3 py-1 text-sm hover:bg-muted"
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
          <p className="text-sm text-muted-foreground">Nothing public here yet.</p>
        ) : (
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
            {savesWithUrls.map((save) => (
              <div key={save.id} className="mb-4 break-inside-avoid overflow-hidden rounded-lg border bg-card">
                {save.mediaUrl &&
                  (save.media_type === "video" ? (
                    <video src={save.mediaUrl} className="w-full" muted loop playsInline />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={save.mediaUrl} alt={save.caption ?? ""} className="w-full" loading="lazy" />
                  ))}
                {save.caption && <p className="p-2 text-sm text-muted-foreground">{save.caption}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

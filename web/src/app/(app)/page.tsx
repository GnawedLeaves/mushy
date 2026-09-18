import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSignedMediaUrls } from "@/lib/media";
import { loadMoreSaves } from "@/lib/actions/gallery";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { InfiniteMasonryGrid } from "@/components/gallery/InfiniteMasonryGrid";
import { cn } from "@/lib/utils";
import type { SaveWithUrl } from "@/lib/types";

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const sortMode = sort === "manual" ? "manual" : "date";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: boards } = await supabase.from("boards").select("id, title").eq("owner_id", user.id).order("title");

  const sortToggle = (
    <div className="flex gap-1 rounded-md border p-1 text-sm">
      <Link href="/?sort=date" className={cn("rounded px-2 py-1", sortMode === "date" && "bg-muted font-medium")}>
        Date saved
      </Link>
      <Link href="/?sort=manual" className={cn("rounded px-2 py-1", sortMode === "manual" && "bg-muted font-medium")}>
        My order
      </Link>
    </div>
  );

  if (sortMode === "manual") {
    const { data: saves } = await supabase
      .from("saves")
      .select("*")
      .eq("owner_id", user.id)
      .order("position", { ascending: true });

    const urlMap = await getSignedMediaUrls((saves ?? []).map((s) => s.storage_path));
    const savesWithUrls: SaveWithUrl[] = (saves ?? []).map((s) => ({ ...s, mediaUrl: urlMap[s.storage_path] ?? null }));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Your gallery</h1>
          {sortToggle}
        </div>
        {savesWithUrls.length === 0 ? (
          <EmptyGallery />
        ) : (
          <GalleryGrid saves={savesWithUrls} boards={boards ?? []} />
        )}
      </div>
    );
  }

  const firstPage = await loadMoreSaves(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your gallery</h1>
        {sortToggle}
      </div>
      {firstPage.saves.length === 0 ? (
        <EmptyGallery />
      ) : (
        <InfiniteMasonryGrid initialSaves={firstPage.saves} initialCursor={firstPage.nextCursor} boards={boards ?? []} />
      )}
    </div>
  );
}

function EmptyGallery() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-24 text-center text-muted-foreground">
      <p className="text-sm">
        Nothing saved yet. Install the browser extension and right-click any image, gif, or video to send it
        here.
      </p>
    </div>
  );
}

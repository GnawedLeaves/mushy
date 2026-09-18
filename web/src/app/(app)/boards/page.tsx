import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSignedMediaUrl } from "@/lib/media";
import { CreateBoardDialog } from "@/components/boards/CreateBoardDialog";
import { Lock } from "lucide-react";

export default async function BoardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: boards } = await supabase
    .from("boards")
    .select("id, title, description, is_private, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const covers = await Promise.all(
    (boards ?? []).map(async (board) => {
      const { data: firstSave } = await supabase
        .from("board_saves")
        .select("saves(storage_path)")
        .eq("board_id", board.id)
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle();

      const storagePath = (firstSave?.saves as { storage_path: string } | null)?.storage_path;
      return storagePath ? await getSignedMediaUrl(storagePath) : null;
    })
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your boards</h1>
        <CreateBoardDialog />
      </div>

      {!boards || boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-24 text-center text-muted-foreground">
          <p className="text-sm">No boards yet. Create one to start grouping your saves.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {boards.map((board, i) => (
            <Link
              key={board.id}
              href={`/boards/${board.id}`}
              className="group overflow-hidden rounded-lg border bg-card"
            >
              <div className="relative aspect-square bg-muted">
                {covers[i] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={covers[i]!} alt="" className="h-full w-full object-cover" />
                )}
                {board.is_private && (
                  <Lock className="absolute right-2 top-2 h-4 w-4 text-white drop-shadow" />
                )}
              </div>
              <div className="p-2">
                <p className="truncate text-sm font-medium">{board.title}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { getSignedMediaUrl } from "@/lib/media";
import { CreateBoardDialog } from "@/components/boards/CreateBoardDialog";
import { BoardsGrid, type BoardTile } from "@/components/boards/BoardsGrid";
import { LayoutGrid } from "lucide-react";

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

  const tiles: BoardTile[] = (boards ?? []).map((board, i) => ({
    id: board.id,
    title: board.title,
    is_private: board.is_private,
    cover: covers[i],
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your boards</h1>
        <CreateBoardDialog />
      </div>

      {tiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-24 text-center text-muted-foreground">
          <LayoutGrid className="h-6 w-6" />
          <p className="text-sm">No boards yet. Create one to start grouping your saves.</p>
        </div>
      ) : (
        <BoardsGrid boards={tiles} />
      )}
    </div>
  );
}

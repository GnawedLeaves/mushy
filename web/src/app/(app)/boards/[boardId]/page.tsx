import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSignedMediaUrls } from "@/lib/media";
import { BoardGrid } from "@/components/boards/BoardGrid";
import { BoardSettingsMenu } from "@/components/boards/BoardSettingsMenu";
import { AddSavesDialog } from "@/components/boards/AddSavesDialog";
import type { SaveWithUrl } from "@/lib/types";

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: board } = await supabase.from("boards").select("*").eq("id", boardId).maybeSingle();
  if (!board) notFound();

  const isOwner = user?.id === board.owner_id;

  const { data: boardSaveRows } = await supabase
    .from("board_saves")
    .select("save_id, position, saves(*)")
    .eq("board_id", boardId)
    .order("position", { ascending: true });

  const saveRows = (boardSaveRows ?? [])
    .map((row) => row.saves)
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const urlMap = await getSignedMediaUrls(saveRows.map((s) => s.storage_path));
  const savesWithUrls: SaveWithUrl[] = saveRows.map((s) => ({ ...s, mediaUrl: urlMap[s.storage_path] ?? null }));

  let availableSaves: SaveWithUrl[] = [];
  if (isOwner) {
    const onBoardIds = new Set(saveRows.map((s) => s.id));
    const { data: allSaves } = await supabase
      .from("saves")
      .select("*")
      .eq("owner_id", user!.id)
      .order("created_at", { ascending: false });

    const notOnBoard = (allSaves ?? []).filter((s) => !onBoardIds.has(s.id));
    const availableUrlMap = await getSignedMediaUrls(notOnBoard.map((s) => s.storage_path));
    availableSaves = notOnBoard.map((s) => ({ ...s, mediaUrl: availableUrlMap[s.storage_path] ?? null }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{board.title}</h1>
          {board.description && <p className="mt-1 text-sm text-muted-foreground">{board.description}</p>}
        </div>
        {isOwner && (
          <div className="flex items-center gap-2">
            <AddSavesDialog boardId={boardId} availableSaves={availableSaves} />
            <BoardSettingsMenu board={board} />
          </div>
        )}
      </div>

      {savesWithUrls.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-24 text-center text-muted-foreground">
          <p className="text-sm">No saves on this board yet.</p>
        </div>
      ) : (
        <BoardGrid boardId={boardId} saves={savesWithUrls} editable={isOwner} />
      )}
    </div>
  );
}

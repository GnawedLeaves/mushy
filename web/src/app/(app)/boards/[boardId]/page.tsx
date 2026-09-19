import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSignedMediaUrls } from "@/lib/media";
import { type AvailableSavesCursor } from "@/lib/actions/board-saves";
import { AVAILABLE_SAVES_PAGE_SIZE } from "@/lib/limits";
import { BoardGrid } from "@/components/boards/BoardGrid";
import { BoardSettingsMenu } from "@/components/boards/BoardSettingsMenu";
import { AddSavesDialog } from "@/components/boards/AddSavesDialog";
import { BackButton } from "@/components/nav/BackButton";
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

  // Only the first page: see loadMoreAvailableSaves's comment for why the
  // dialog no longer gets the owner's whole library in one shot.
  let availableSaves: SaveWithUrl[] = [];
  let availableCursor: AvailableSavesCursor | null = null;
  if (isOwner) {
    const onBoardIds = new Set(saveRows.map((s) => s.id));
    let query = supabase
      .from("saves")
      .select("*")
      .eq("owner_id", user!.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(AVAILABLE_SAVES_PAGE_SIZE);
    if (onBoardIds.size > 0) query = query.not("id", "in", `(${[...onBoardIds].join(",")})`);

    const { data: firstPage } = await query;
    const rows = firstPage ?? [];
    const availableUrlMap = await getSignedMediaUrls(rows.map((s) => s.storage_path));
    availableSaves = rows.map((s) => ({ ...s, mediaUrl: availableUrlMap[s.storage_path] ?? null }));

    const last = rows[rows.length - 1];
    availableCursor = rows.length === AVAILABLE_SAVES_PAGE_SIZE && last ? { createdAt: last.created_at, id: last.id } : null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <BackButton className="mt-0.5 shrink-0" />
          <div>
            <h1 className="text-xl font-semibold">{board.title}</h1>
            {board.description && <p className="mt-1 text-sm text-muted-foreground">{board.description}</p>}
          </div>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2">
            <AddSavesDialog boardId={boardId} availableSaves={availableSaves} initialCursor={availableCursor} />
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

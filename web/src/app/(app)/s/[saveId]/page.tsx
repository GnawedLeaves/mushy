import Link from "next/link";
import { ExternalLink, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSignedMediaUrl } from "@/lib/media";
import { getSaveReactionSummary } from "@/lib/actions/reactions";
import { listComments } from "@/lib/actions/comments";
import { MediaThumb } from "@/components/gallery/MediaThumb";
import { ReactionButtons } from "@/components/save-detail/ReactionButtons";
import { FullscreenViewer } from "@/components/save-detail/FullscreenViewer";
import { CommentSection } from "@/components/save-detail/CommentSection";
import { SaveToGalleryButton } from "@/components/save-detail/SaveToGalleryButton";

export default async function SaveDetailPage({
  params,
}: {
  params: Promise<{ saveId: string }>;
}) {
  const { saveId } = await params;
  const supabase = await createClient();

  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const { data: save } = await supabase.from("saves").select("*").eq("id", saveId).maybeSingle();

  if (!save) {
    return <p className="text-muted-foreground">This save doesn&apos;t exist, or is private.</p>;
  }

  const isOwner = viewer?.id === save.owner_id;

  const [{ data: owner }, mediaUrl, reactionSummary, comments] = await Promise.all([
    supabase.from("profiles").select("username, display_name").eq("id", save.owner_id).maybeSingle(),
    getSignedMediaUrl(save.storage_path),
    getSaveReactionSummary(save.id),
    listComments(save.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="relative flex max-h-[70vh] items-center justify-center bg-muted">
          <MediaThumb
            mediaUrl={mediaUrl}
            mediaType={save.media_type}
            alt={save.caption ?? "Saved design"}
            className="max-h-[70vh] w-full object-contain"
          />
          {save.is_private && (
            <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
              <Lock className="h-3 w-3" />
              Private
            </div>
          )}
        </div>

        <div className="space-y-4 p-5">
          {save.caption && <p className="text-base">{save.caption}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Saved {new Date(save.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {owner && (
                <>
                  {" "}
                  by{" "}
                  <Link href={`/u/${owner.username}`} className="text-foreground hover:underline">
                    {owner.display_name || `@${owner.username}`}
                  </Link>
                </>
              )}
            </div>
            <a
              href={save.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {save.source_title || "View source"}
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ReactionButtons
              saveId={save.id}
              initialLikes={reactionSummary.likes}
              initialDislikes={reactionSummary.dislikes}
              initialMyReaction={reactionSummary.myReaction}
              canReact={!!viewer}
            />
            {mediaUrl && <FullscreenViewer mediaUrl={mediaUrl} mediaType={save.media_type} alt={save.caption ?? ""} />}
            {!isOwner && viewer && <SaveToGalleryButton saveId={save.id} />}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <CommentSection saveId={save.id} initialComments={comments} canComment={!!viewer} />
      </div>
    </div>
  );
}

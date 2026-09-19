-- Adds "save_dislike" alongside the existing "save_like"/"comment" types so
-- disliking a save can notify its owner too (see lib/actions/reactions.ts's
-- setSaveReaction) -- previously only a like did, and the notification
-- center had no way to represent a dislike at all.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('save_like', 'save_dislike', 'comment'));

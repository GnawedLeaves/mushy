-- Notification center: "someone liked/commented on your save". Written by
-- the SAME Server Action that creates the underlying like or comment (see
-- lib/actions/reactions.ts's setSaveReaction and lib/actions/comments.ts's
-- addComment), running as the acting user's own RLS-scoped client, not an
-- admin one -- so the insert policy has to let any authenticated user
-- create a notification, but only ever attributed to themselves as the
-- actor. It's the recipient side (read/update/delete) that's locked down.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('save_like', 'comment')),
  save_id uuid not null references public.saves (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications: recipient can read own"
  on public.notifications for select
  using (recipient_id = auth.uid());

create policy "notifications: actor can create, attributed to themselves"
  on public.notifications for insert
  with check (actor_id = auth.uid());

create policy "notifications: recipient can mark read"
  on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy "notifications: recipient can delete own"
  on public.notifications for delete
  using (recipient_id = auth.uid());

-- Likes/dislikes on saves, comments on saves, and likes/dislikes on
-- comments. `comments.parent_comment_id` is included now (nullable, unused
-- by the UI yet) so a future reply thread doesn't need another migration --
-- "make way for a reply system in the future" per the product ask.

-- ── save_reactions ──────────────────────────────────────────────────────

create table public.save_reactions (
  save_id uuid not null references public.saves (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  primary key (save_id, user_id)
);

create index save_reactions_save_id_idx on public.save_reactions (save_id);

alter table public.save_reactions enable row level security;

-- Readable by anyone who can already see the save (own or public) -- same
-- predicate as "saves: read own or public" in 0001_init.sql, joined through.
create policy "save_reactions: read if save visible"
  on public.save_reactions for select
  using (
    exists (
      select 1 from public.saves s
      left join public.profiles p on p.id = s.owner_id
      where s.id = save_reactions.save_id
        and (s.owner_id = auth.uid() or (s.is_private = false and p.is_private = false))
    )
  );

-- A reaction is yours alone to write, and only on a save you can actually see.
create policy "save_reactions: write own on visible save"
  on public.save_reactions for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.saves s
      left join public.profiles p on p.id = s.owner_id
      where s.id = save_id
        and (s.owner_id = auth.uid() or (s.is_private = false and p.is_private = false))
    )
  );

-- ── comments ────────────────────────────────────────────────────────────

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  save_id uuid not null references public.saves (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_comment_id uuid references public.comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index comments_save_id_idx on public.comments (save_id, created_at);
create index comments_parent_comment_id_idx on public.comments (parent_comment_id);

alter table public.comments enable row level security;

create policy "comments: read if save visible"
  on public.comments for select
  using (
    exists (
      select 1 from public.saves s
      left join public.profiles p on p.id = s.owner_id
      where s.id = comments.save_id
        and (s.owner_id = auth.uid() or (s.is_private = false and p.is_private = false))
    )
  );

create policy "comments: insert own on visible save"
  on public.comments for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.saves s
      left join public.profiles p on p.id = s.owner_id
      where s.id = save_id
        and (s.owner_id = auth.uid() or (s.is_private = false and p.is_private = false))
    )
  );

-- Delete only your own comment. Deliberately no update policy at all --
-- "no editing allowed" means literally no UPDATE path, not just a hidden
-- UI button.
create policy "comments: delete own"
  on public.comments for delete
  using (user_id = auth.uid());

-- ── comment_reactions ───────────────────────────────────────────────────

create table public.comment_reactions (
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index comment_reactions_comment_id_idx on public.comment_reactions (comment_id);

alter table public.comment_reactions enable row level security;

create policy "comment_reactions: read if save visible"
  on public.comment_reactions for select
  using (
    exists (
      select 1 from public.comments c
      join public.saves s on s.id = c.save_id
      left join public.profiles p on p.id = s.owner_id
      where c.id = comment_reactions.comment_id
        and (s.owner_id = auth.uid() or (s.is_private = false and p.is_private = false))
    )
  );

create policy "comment_reactions: write own on visible save"
  on public.comment_reactions for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.comments c
      join public.saves s on s.id = c.save_id
      left join public.profiles p on p.id = s.owner_id
      where c.id = comment_id
        and (s.owner_id = auth.uid() or (s.is_private = false and p.is_private = false))
    )
  );

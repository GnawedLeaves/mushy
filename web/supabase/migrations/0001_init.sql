-- Mushy initial schema: profiles, boards, saves, board_saves, personal access tokens.
-- Privacy model: three independent flags (profile / board / save), enforced via RLS
-- below -- not just hidden in the UI. See Notion "Mushy" doc for the reasoning.

create extension if not exists "pgcrypto";

-- ── profiles ─────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  display_name text,
  bio text,
  avatar_path text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_username_idx on public.profiles (username);

-- Auto-create a profile row when a new auth user signs up. The username is a
-- placeholder derived from the email; the user edits it in Settings.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '', 'g'));
  if base_username = '' or base_username is null then
    base_username := 'user';
  end if;

  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username) values (new.id, final_username);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep updated_at fresh on every update, for all tables that have it
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── boards ───────────────────────────────────────────────────────────────

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index boards_owner_id_idx on public.boards (owner_id);

create trigger boards_set_updated_at
  before update on public.boards
  for each row execute function public.set_updated_at();

-- ── saves ────────────────────────────────────────────────────────────────

create table public.saves (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'gif', 'video')),
  mime_type text not null,
  file_size_bytes bigint,
  width int,
  height int,
  source_url text not null,
  source_title text,
  caption text,
  is_private boolean not null default false,
  position double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saves_owner_id_idx on public.saves (owner_id);
create index saves_owner_created_idx on public.saves (owner_id, created_at desc);
create index saves_owner_position_idx on public.saves (owner_id, position);

create trigger saves_set_updated_at
  before update on public.saves
  for each row execute function public.set_updated_at();

-- ── board_saves (many-to-many: a save can live in multiple boards) ────────

create table public.board_saves (
  board_id uuid not null references public.boards (id) on delete cascade,
  save_id uuid not null references public.saves (id) on delete cascade,
  -- Denormalized: always equals both the board's and save's owner_id. Set
  -- once by the Server Action at insert time (never user-editable) purely so
  -- RLS on this junction table is a flat check instead of a nested join.
  owner_id uuid not null references auth.users (id) on delete cascade,
  position double precision not null,
  added_at timestamptz not null default now(),
  primary key (board_id, save_id)
);

create index board_saves_board_id_idx on public.board_saves (board_id);
create index board_saves_save_id_idx on public.board_saves (save_id);

-- ── personal access tokens (browser extension auth) ────────────────────────

create table public.personal_access_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  name text not null default 'Browser Extension',
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index pat_user_id_idx on public.personal_access_tokens (user_id);

-- ── Row Level Security ──────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.boards enable row level security;
alter table public.saves enable row level security;
alter table public.board_saves enable row level security;
alter table public.personal_access_tokens enable row level security;

-- profiles: anyone can read a public profile; only the owner can read/write their own
create policy "profiles: read own or public"
  on public.profiles for select
  using (id = auth.uid() or is_private = false);

create policy "profiles: insert own"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- boards: owner always; others only if both the board and the owning profile are public
create policy "boards: read own or public"
  on public.boards for select
  using (
    owner_id = auth.uid()
    or (
      is_private = false
      and exists (
        select 1 from public.profiles p
        where p.id = boards.owner_id and p.is_private = false
      )
    )
  );

create policy "boards: write own"
  on public.boards for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- saves: owner always; others only if the save, and the owning profile, are public
create policy "saves: read own or public"
  on public.saves for select
  using (
    owner_id = auth.uid()
    or (
      is_private = false
      and exists (
        select 1 from public.profiles p
        where p.id = saves.owner_id and p.is_private = false
      )
    )
  );

create policy "saves: write own"
  on public.saves for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- board_saves: owner always; others only if board, save, and profile are all public
create policy "board_saves: read own or public"
  on public.board_saves for select
  using (
    owner_id = auth.uid()
    or (
      exists (select 1 from public.boards b where b.id = board_saves.board_id and b.is_private = false)
      and exists (select 1 from public.saves s where s.id = board_saves.save_id and s.is_private = false)
      and exists (select 1 from public.profiles p where p.id = board_saves.owner_id and p.is_private = false)
    )
  );

create policy "board_saves: write own"
  on public.board_saves for all
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.boards b where b.id = board_id and b.owner_id = auth.uid())
    and exists (select 1 from public.saves s where s.id = save_id and s.owner_id = auth.uid())
  );

-- personal_access_tokens: owner only, no public read at all
create policy "pat: owner only"
  on public.personal_access_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── Storage buckets + policies ─────────────────────────────────────────────
-- "media": private, all saved images/gifs/videos, path "{owner_id}/{save_id}.{ext}"
-- "avatars": public, profile pictures only

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Reads go through signed URLs generated server-side after an RLS-scoped
-- query already succeeded, so Storage RLS only needs to guard uploads. The
-- extension's own upload goes through the service-role client and bypasses
-- this entirely (it writes explicitly under the resolved owner_id's folder).
create policy "media: owner can insert"
  on storage.objects for insert
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "media: owner can delete"
  on storage.objects for delete
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: owner can insert"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: owner can update"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

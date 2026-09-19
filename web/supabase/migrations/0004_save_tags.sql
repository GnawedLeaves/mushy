-- Hidden aesthetic tags, generated best-effort by an AI vision call at save
-- time (see src/lib/ai/aestheticTags.ts). Never rendered in the UI directly
-- -- only used to filter Discover's tag search -- so no RLS changes are
-- needed here: the existing saves policies already gate the whole row,
-- tags included.
alter table public.saves
  add column tags text[] not null default '{}';

create index if not exists saves_tags_gin_idx on public.saves using gin (tags);

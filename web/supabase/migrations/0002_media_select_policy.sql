-- 0001_init.sql only added INSERT/DELETE policies on storage.objects for the
-- "media" bucket -- no SELECT policy. With RLS enabled and zero SELECT
-- policies, Supabase Storage denies createSignedUrl() to every non-service-role
-- caller, including the object's own owner: it returns a generic
-- "Object not found" (404/NoSuchKey), which looks identical to a missing
-- file, not a permission error. That's why the gallery couldn't load any
-- saved images. Confirmed by reproduction: a fresh test user could read a
-- public `saves` row (table RLS is fine) but got "Object not found" trying
-- to sign its storage_path.
--
-- This mirrors the same "own or public" predicate already used on the
-- `saves` table itself (see 0001_init.sql), just checked against
-- storage.objects.name instead of saves.id.

create policy "media: read own or public"
  on storage.objects for select
  using (
    bucket_id = 'media'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.saves s
        join public.profiles p on p.id = s.owner_id
        where s.storage_path = storage.objects.name
          and s.is_private = false
          and p.is_private = false
      )
    )
  );

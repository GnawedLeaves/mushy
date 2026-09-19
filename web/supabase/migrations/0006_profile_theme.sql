-- Theme preference (Settings -> Appearance) lives on the account, not just
-- in this browser's localStorage -- localStorage alone already survives a
-- log out/log in on the SAME browser (logging out doesn't clear it), but
-- says nothing on a different device/browser. Storing it on the profile
-- makes "log in somewhere new and get your saved theme back" possible too.
alter table public.profiles
  add column theme text not null default 'system' check (theme in ('light', 'dark', 'system'));

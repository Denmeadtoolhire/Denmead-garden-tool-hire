-- RLS was switched on for `tools` without any policy permitting writes, so the
-- admin page could read the catalogue but never add to it.
--
-- SECURITY NOTE: the admin pages authenticate in the browser and talk to
-- Supabase with the public anon key, so a policy that lets the admin page write
-- necessarily lets anyone holding that key write too. These policies restore
-- the admin page at that cost. When admin login moves to real Supabase auth,
-- replace `true` below with `auth.role() = 'authenticated'` to close it.

alter table tools enable row level security;

drop policy if exists "Tools readable by all" on tools;
create policy "Tools readable by all"
  on tools for select
  using (true);

drop policy if exists "Tools writable with anon key" on tools;
create policy "Tools writable with anon key"
  on tools for all
  using (true)
  with check (true);

-- Harden public.subscribers.
--
-- This table was created via the Supabase dashboard (no migration existed),
-- and the public /api/subscribe endpoint wrote to it with the anon key, which
-- only works when RLS is disabled or permissive -- meaning anyone holding the
-- (public) anon key could read every subscriber email.
--
-- New model: RLS enabled, no policies for anon/authenticated (service-key-only
-- access). /api/subscribe now writes with the service key server-side after
-- validating the email, checking the honeypot, and rate limiting. The weekly
-- newsletter sender and /api/unsubscribe already use the service key.

do $$
declare
  pol record;
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'subscribers'
  ) then
    raise notice 'public.subscribers does not exist, skipping RLS hardening';
    return;
  end if;

  alter table public.subscribers enable row level security;

  -- Drop any existing (possibly permissive) policies so we start clean.
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'subscribers'
  loop
    execute format('drop policy %I on public.subscribers', pol.policyname);
  end loop;

  -- No policies remain: anon and authenticated get nothing. The service key
  -- bypasses RLS, which is what all server-side code paths use.
  revoke all on public.subscribers from anon, authenticated;
end
$$;

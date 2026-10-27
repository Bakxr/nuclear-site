-- Double opt-in for the newsletter. A sign-up now creates (or reactivates) a
-- row with confirmed_at null and emails a confirmation link; senders only mail
-- rows that are active AND confirmed. Existing active subscribers predate the
-- change and are grandfathered as confirmed.
alter table public.subscribers
  add column if not exists confirmed_at timestamptz;

update public.subscribers
  set confirmed_at = coalesce(created_at, now())
  where active and confirmed_at is null;

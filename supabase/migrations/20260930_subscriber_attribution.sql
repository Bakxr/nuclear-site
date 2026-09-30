-- First-touch attribution for newsletter sign-ups: where the subscriber
-- came from (utm_source or referrer host), which campaign, which page they
-- landed on, and which form they used. Written once, on first sign-up.
alter table public.subscribers
  add column if not exists source text,
  add column if not exists campaign text,
  add column if not exists referrer text,
  add column if not exists landing text,
  add column if not exists surface text;

create index if not exists subscribers_created_at_idx on public.subscribers (created_at desc);

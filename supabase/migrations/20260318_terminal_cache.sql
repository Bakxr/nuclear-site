create table if not exists public.terminal_cache (
  key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.terminal_cache enable row level security;

revoke all on public.terminal_cache from anon, authenticated;

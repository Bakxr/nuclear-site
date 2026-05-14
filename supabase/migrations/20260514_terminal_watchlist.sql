create table public.terminal_watchlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id text not null,
  entity_type text not null,
  entity_label text not null,
  created_at timestamptz default now(),
  primary key (user_id, entity_id)
);

create index if not exists terminal_watchlist_user_id_idx on public.terminal_watchlist (user_id);

alter table public.terminal_watchlist enable row level security;

create policy "terminal_watchlist_self_select" on public.terminal_watchlist
  for select using (auth.uid() = user_id);

create policy "terminal_watchlist_self_insert" on public.terminal_watchlist
  for insert with check (auth.uid() = user_id);

create policy "terminal_watchlist_self_delete" on public.terminal_watchlist
  for delete using (auth.uid() = user_id);

revoke all on public.terminal_watchlist from anon;
grant select, insert, delete on public.terminal_watchlist to authenticated;

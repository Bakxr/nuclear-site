-- Terminal dispatch infrastructure: per-user threshold alerts and an
-- idempotency / audit log for daily, weekly, and alert email sends.

-- Alert subscriptions. Owned per user, scoped by RLS so only the owner
-- can read or mutate. The cron uses the service key (which bypasses RLS).
create table public.terminal_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_type text not null check (alert_type in ('price_drop', 'price_rise', 'percent_drop', 'percent_rise', 'entity_event')),
  target_id text not null,
  target_label text not null,
  threshold numeric,
  active boolean not null default true,
  created_at timestamptz default now(),
  last_fired_at timestamptz,
  fire_count integer not null default 0
);

create index terminal_alerts_user_active_idx on public.terminal_alerts (user_id) where active;
create index terminal_alerts_target_active_idx on public.terminal_alerts (target_id) where active;

alter table public.terminal_alerts enable row level security;
create policy "terminal_alerts_self_select" on public.terminal_alerts for select using (auth.uid() = user_id);
create policy "terminal_alerts_self_insert" on public.terminal_alerts for insert with check (auth.uid() = user_id);
create policy "terminal_alerts_self_update" on public.terminal_alerts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "terminal_alerts_self_delete" on public.terminal_alerts for delete using (auth.uid() = user_id);
revoke all on public.terminal_alerts from anon;
grant select, insert, update, delete on public.terminal_alerts to authenticated;

-- Idempotency / send log. The unique `(user_id, dispatch_key)` constraint is the
-- "never send twice" guarantee for authenticated sends. For the free-tier
-- weekly digest user_id is null and we rely on the email + dispatch_key index.
create table public.terminal_dispatch_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  dispatch_type text not null,
  dispatch_key text not null,
  alert_id uuid references public.terminal_alerts(id) on delete set null,
  sent_at timestamptz default now(),
  unique (user_id, dispatch_key)
);

create index terminal_dispatch_log_email_dispatch_idx on public.terminal_dispatch_log (email, dispatch_key);

alter table public.terminal_dispatch_log enable row level security;
revoke all on public.terminal_dispatch_log from anon, authenticated;

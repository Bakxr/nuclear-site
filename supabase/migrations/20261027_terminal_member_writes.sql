-- Terminal alerts and watchlist are paid features, but their insert policies
-- only checked ownership, so any signed-in account (no subscription) could
-- write rows straight through the Supabase REST API with the public anon key,
-- skipping /api/alerts' terminal-access gate and 50-alert cap.
--
-- Inserts now also require an active terminal membership. Reads and deletes
-- stay owner-only, so a lapsed member can still see and clean up their rows.

create or replace function public.has_terminal_access(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.billing_memberships
    where user_id = p_user_id and terminal_access
  );
$$;

revoke all on function public.has_terminal_access(uuid) from public, anon;
grant execute on function public.has_terminal_access(uuid) to authenticated;

drop policy if exists "terminal_alerts_self_insert" on public.terminal_alerts;
create policy "terminal_alerts_member_insert" on public.terminal_alerts
  for insert with check (auth.uid() = user_id and public.has_terminal_access(auth.uid()));

drop policy if exists "terminal_watchlist_self_insert" on public.terminal_watchlist;
create policy "terminal_watchlist_member_insert" on public.terminal_watchlist
  for insert with check (auth.uid() = user_id and public.has_terminal_access(auth.uid()));

-- Members may only toggle `active`; fire_count / last_fired_at / threshold are
-- written by the cron (service key) or set at insert time.
revoke update on public.terminal_alerts from authenticated;
grant update (active) on public.terminal_alerts to authenticated;

-- Cap alerts per user at the database too (mirrors MAX_ALERTS_PER_USER).
create or replace function public.enforce_alert_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.terminal_alerts where user_id = new.user_id) >= 50 then
    raise exception 'alert limit reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists terminal_alerts_cap on public.terminal_alerts;
create trigger terminal_alerts_cap
  before insert on public.terminal_alerts
  for each row execute function public.enforce_alert_cap();

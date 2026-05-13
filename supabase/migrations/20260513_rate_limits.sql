-- Rate limits — atomic, cross-instance limiter backing api/_lib/rateLimit.js.
-- Replaces the per-warm-instance in-memory limiter which attackers could bypass
-- by hitting different Vercel function instances.

create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null
);

create index if not exists rate_limits_reset_at_idx on public.rate_limits (reset_at);

alter table public.rate_limits enable row level security;

-- No client-side access. Service role bypasses RLS, and the function below is
-- security definer so callers do not need direct grants.
revoke all on public.rate_limits from anon, authenticated;

-- Atomic check-and-increment. Returns true if the request is allowed.
create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_ms integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window interval := make_interval(secs => p_window_ms / 1000.0);
  v_count integer;
begin
  insert into public.rate_limits (key, count, reset_at)
  values (p_key, 1, v_now + v_window)
  on conflict (key) do update
    set
      count = case
        when public.rate_limits.reset_at < v_now then 1
        else public.rate_limits.count + 1
      end,
      reset_at = case
        when public.rate_limits.reset_at < v_now then v_now + v_window
        else public.rate_limits.reset_at
      end
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;

-- Convenience: callers can prune stale rows occasionally.
create or replace function public.prune_rate_limits() returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limits where reset_at < now() - interval '1 day';
$$;

revoke all on function public.prune_rate_limits() from public, anon, authenticated;

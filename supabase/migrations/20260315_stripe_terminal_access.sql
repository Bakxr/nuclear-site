create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.billing_memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan_interval text check (plan_interval is null or plan_interval in ('month', 'year')),
  subscription_status text not null default 'inactive',
  terminal_access boolean not null default false,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_checkout_session_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists billing_memberships_terminal_access_idx
  on public.billing_memberships (terminal_access);

create index if not exists billing_memberships_customer_idx
  on public.billing_memberships (stripe_customer_id);

drop trigger if exists set_billing_memberships_updated_at on public.billing_memberships;
create trigger set_billing_memberships_updated_at
before update on public.billing_memberships
for each row
execute function public.set_current_timestamp_updated_at();

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default timezone('utc', now())
);

alter table public.billing_memberships enable row level security;
alter table public.stripe_webhook_events enable row level security;

grant select on public.billing_memberships to authenticated;
revoke insert, update, delete on public.billing_memberships from authenticated;
revoke all on public.billing_memberships from anon;
revoke all on public.stripe_webhook_events from anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'billing_memberships'
      and policyname = 'Users can read their own billing membership'
  ) then
    create policy "Users can read their own billing membership"
      on public.billing_memberships
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end;
$$;

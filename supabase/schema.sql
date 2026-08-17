-- Financial Tracker — schema, RLS and realtime
-- Safe to re-run. Paste into Supabase → SQL Editor → Run.
-- Assumes tables keyed on auth.users(id). If your existing tables use bigint ids
-- instead of uuid, skip section 1 and run sections 2–4 only.

-- ─────────────────────────────────────────────────────────────
-- 1. Tables
-- ─────────────────────────────────────────────────────────────

create table if not exists public.source (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  source_type       text not null check (source_type in ('main_account', 'pot_account')),
  source_name       text not null,
  transaction_count integer not null default 0,
  created_at        timestamptz not null default now()
);

create table if not exists public.monthly_data (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  source_id    uuid references public.source(id) on delete cascade,
  month        text not null,          -- 'YYYY-MM'
  date         text not null,          -- 'DD/MM/YYYY' as exported by Monzo
  category     text not null default 'Other',
  type         text not null default 'unknown',
  description  text default '',
  amount       numeric(12,2) not null, -- negative = spend, positive = income
  account_type text not null check (account_type in ('main', 'pot')),
  created_at   timestamptz not null default now()
);

create table if not exists public.goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  goal_name       text not null,
  goal_amount     numeric(12,2) not null default 0,
  current_amount  numeric(12,2) not null default 0,
  monthly_savings numeric(12,2) not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, goal_name)
);

-- Budget lines. The user names the bill themselves; `category` is the only field
-- that ties a line back to bank statements, so it is what rolls up to actuals.
create table if not exists public.budget (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  bill       text not null,
  target     numeric(12,2),          -- monthly, null when not yet set
  category   text not null default 'Other',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 1b. Goal forecasting columns, and blanks allowed on every amount
-- ─────────────────────────────────────────────────────────────

alter table public.goals add column if not exists savings_type text;   -- 'cash_isa', 'stocks_isa', 'pension', …
alter table public.goals add column if not exists annual_rate  numeric(6,3); -- assumed % growth a year
alter table public.goals add column if not exists target_date  text;   -- 'YYYY-MM'

alter table public.goals alter column goal_amount     drop not null;
alter table public.goals alter column current_amount  drop not null;
alter table public.goals alter column monthly_savings drop not null;
alter table public.goals alter column goal_amount     drop default;
alter table public.goals alter column current_amount  drop default;
alter table public.goals alter column monthly_savings drop default;

-- ─────────────────────────────────────────────────────────────
-- 2. Indexes (the page filters on user_id everywhere)
-- ─────────────────────────────────────────────────────────────

create index if not exists monthly_data_user_idx      on public.monthly_data (user_id);
create index if not exists monthly_data_user_mon_idx  on public.monthly_data (user_id, month);
create index if not exists monthly_data_source_idx    on public.monthly_data (source_id);
create index if not exists source_user_idx            on public.source (user_id, created_at desc);
create index if not exists goals_user_idx             on public.goals (user_id);
create index if not exists budget_user_idx            on public.budget (user_id, sort_order);

-- ─────────────────────────────────────────────────────────────
-- 3. Row-level security — each user sees only their own rows
-- ─────────────────────────────────────────────────────────────

alter table public.monthly_data enable row level security;
alter table public.source       enable row level security;
alter table public.goals        enable row level security;
alter table public.budget       enable row level security;

do $$
declare t text;
begin
  foreach t in array array['monthly_data', 'source', 'goals', 'budget'] loop
    execute format('drop policy if exists "own rows select" on public.%I', t);
    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('drop policy if exists "own rows delete" on public.%I', t);

    execute format($f$create policy "own rows select" on public.%I
      for select using (auth.uid() = user_id)$f$, t);
    execute format($f$create policy "own rows insert" on public.%I
      for insert with check (auth.uid() = user_id)$f$, t);
    execute format($f$create policy "own rows update" on public.%I
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id)$f$, t);
    execute format($f$create policy "own rows delete" on public.%I
      for delete using (auth.uid() = user_id)$f$, t);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 4. Realtime — the page subscribes to all three tables
-- ─────────────────────────────────────────────────────────────

alter table public.monthly_data replica identity full;
alter table public.source       replica identity full;
alter table public.goals        replica identity full;
alter table public.budget       replica identity full;

do $$
begin
  begin execute 'alter publication supabase_realtime add table public.monthly_data'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.source';       exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.goals';        exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.budget';       exception when duplicate_object then null; end;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 5. Keep goals.updated_at honest
-- ─────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists goals_touch_updated_at on public.goals;
create trigger goals_touch_updated_at
  before update on public.goals
  for each row execute function public.touch_updated_at();

drop trigger if exists budget_touch_updated_at on public.budget;
create trigger budget_touch_updated_at
  before update on public.budget
  for each row execute function public.touch_updated_at();

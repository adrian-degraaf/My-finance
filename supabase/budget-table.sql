-- Budget lines for the Budget Setup page.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
--
-- The user names the bill themselves; `category` is the only field that ties a
-- line back to bank statements, so it is what rolls up to actuals.

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

create index if not exists budget_user_idx on public.budget (user_id, sort_order);

-- Row-level security: each user sees only their own budget lines.
alter table public.budget enable row level security;

drop policy if exists "own rows select" on public.budget;
drop policy if exists "own rows insert" on public.budget;
drop policy if exists "own rows update" on public.budget;
drop policy if exists "own rows delete" on public.budget;

create policy "own rows select" on public.budget
  for select using (auth.uid() = user_id);
create policy "own rows insert" on public.budget
  for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.budget
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows delete" on public.budget
  for delete using (auth.uid() = user_id);

-- Realtime, so the tracker's target updates the moment you save a budget.
alter table public.budget replica identity full;

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.budget';
  exception when duplicate_object then null;
  end;
end $$;

-- Keep updated_at honest. The function already exists if you ran schema.sql.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists budget_touch_updated_at on public.budget;
create trigger budget_touch_updated_at
  before update on public.budget
  for each row execute function public.touch_updated_at();

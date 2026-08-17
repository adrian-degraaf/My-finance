-- Second budget migration: joint-account flag per line, and the user's net salary.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- (If Supabase objects to the whole file at once, run each statement separately.)

-- ── 1. Joint-account flag on each budget line ──────────────────────────────

alter table public.budget add column if not exists joint boolean not null default false;

-- ── 2. Per-user settings: net salary, so spare money can be worked out ─────

create table if not exists public.settings (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  net_salary numeric(12,2),          -- monthly, after tax and deductions
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

drop policy if exists "own row select" on public.settings;
drop policy if exists "own row insert" on public.settings;
drop policy if exists "own row update" on public.settings;
drop policy if exists "own row delete" on public.settings;

create policy "own row select" on public.settings
  for select using (auth.uid() = user_id);
create policy "own row insert" on public.settings
  for insert with check (auth.uid() = user_id);
create policy "own row update" on public.settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row delete" on public.settings
  for delete using (auth.uid() = user_id);

alter table public.settings replica identity full;

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.settings';
  exception when duplicate_object then null;
  end;
end $$;

drop trigger if exists settings_touch_updated_at on public.settings;
create trigger settings_touch_updated_at
  before update on public.settings
  for each row execute function public.touch_updated_at();

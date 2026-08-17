-- Missing DELETE policies.
-- Without these, a delete is silently filtered to zero rows: no error, no effect.
-- That is why "Delete" on an imported source appears to do nothing.
--
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- Run each statement separately if Supabase objects to the whole file.

-- ── monthly_data ───────────────────────────────────────────────────────────
drop policy if exists "own rows delete" on public.monthly_data;
create policy "own rows delete" on public.monthly_data
  for delete using (auth.uid() = user_id);

-- ── source ─────────────────────────────────────────────────────────────────
drop policy if exists "own rows delete" on public.source;
create policy "own rows delete" on public.source
  for delete using (auth.uid() = user_id);

-- ── goals ──────────────────────────────────────────────────────────────────
drop policy if exists "own rows delete" on public.goals;
create policy "own rows delete" on public.goals
  for delete using (auth.uid() = user_id);

-- ── budget ─────────────────────────────────────────────────────────────────
-- Needed for removing a budget line, and for the "Replace all my lines" import.
drop policy if exists "own rows delete" on public.budget;
create policy "own rows delete" on public.budget
  for delete using (auth.uid() = user_id);

-- ── Check what you have ────────────────────────────────────────────────────
-- Run this on its own to confirm every table has all four verbs.
--
-- select tablename, cmd, policyname
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('monthly_data', 'source', 'goals', 'budget', 'settings')
-- order by tablename, cmd;

-- Goals: the forecast columns the Goals page writes but the table does not have yet.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- Run each statement separately if Supabase objects to the whole file.

-- ── 1. Forecast fields ─────────────────────────────────────────────────────
-- Without these three, "Where it is held", "Assumed growth % a year" and
-- "Target date" cannot be saved, so Forecast always assumes no growth.

alter table public.goals add column if not exists savings_type text;          -- 'cash_isa', 'stocks_isa', 'pension', …
alter table public.goals add column if not exists annual_rate  numeric(6,3);  -- assumed % growth a year
alter table public.goals add column if not exists target_date  text;          -- 'YYYY-MM'

-- ── 2. Blanks stay blank ───────────────────────────────────────────────────
-- Every field on the goal form is optional. Without these, an empty amount is
-- coerced to 0 and the page cannot tell "nothing entered" from "zero".

alter table public.goals alter column goal_amount     drop not null;
alter table public.goals alter column current_amount  drop not null;
alter table public.goals alter column monthly_savings drop not null;
alter table public.goals alter column goal_amount     drop default;
alter table public.goals alter column current_amount  drop default;
alter table public.goals alter column monthly_savings drop default;

-- ── 3. Ordering, and letting a finished goal step aside ────────────────────

alter table public.goals add column if not exists sort_order   integer not null default 0;
alter table public.goals add column if not exists archived     boolean not null default false;

-- ── 4. Tie a goal to the pot or category that funds it ─────────────────────
-- Optional. When set, "Saved so far" can be read from your statements instead
-- of being typed in by hand.

alter table public.goals add column if not exists funding_category text;

-- ── 5. Two goals may share a name ──────────────────────────────────────────
-- The unique constraint on (user_id, goal_name) makes renaming a goal to an
-- existing name fail with a constraint error rather than a readable message.

alter table public.goals drop constraint if exists goals_user_id_goal_name_key;

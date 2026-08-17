# Finance Tracker

Two static pages over a Supabase backend. Import Monzo CSV exports, set a monthly
budget, and see spend by category against it.

- `Finance Tracker.dc.html` — import statements, spend by category, savings goals, insights
- `Budget Setup.dc.html` — budget lines from a spreadsheet, budget vs actual

## Running it locally

No build step and no `npm install`. The pages do need to be served over HTTP,
because they load the Supabase client as an ES module — opening the file directly
with `file://` will not work.

```sh
git clone <this repo>
cd <this repo>
python3 -m http.server 8000
```

Open <http://localhost:8000/> — `index.html` forwards to the tracker.

Any static server works — `npx serve`, `php -S localhost:8000`, whatever you have.

## Configuration

`config.js` holds the Supabase URL and anon key.

It is committed, deliberately. A browser app has to hand its credentials to the
browser — there is nowhere to hide them, and anyone can read them from devtools on
any deployed site. The anon key is built for that: it grants nothing on its own,
and row-level security is what protects the data. Keeping it out of the repo would
buy no security and would break deployment.

To point at a different Supabase project, copy `config.example.js` over
`config.js` and fill in your own values.

## Deploying to Vercel

The site is static, so no build step is involved.

1. Sign in to <https://vercel.com> with GitHub
2. **Add New → Project**, import `My-finance`
3. Framework preset: **Other**. Leave build command and output directory empty
4. **Deploy**

`vercel.json` maps two tidy paths: `/tracker` and `/budget`. The root URL redirects
to the tracker via `index.html`.

A deployed URL is reachable by anyone who has it. If that matters, turn off public
sign-ups in Supabase → Authentication → Providers → Email, and create accounts
yourself. Existing users keep working; new strangers cannot register.

## Database

Run the SQL in `supabase/` through the Supabase SQL editor, in this order. Each
file is safe to re-run. **Run the statements one at a time** — the editor will
sometimes reject a whole file that contains several statements.

| Order | File | What it does |
| --- | --- | --- |
| 1 | `schema.sql` | Tables, indexes, RLS policies, realtime, triggers |
| 2 | `budget-table.sql` | `budget` table for the Budget Setup page |
| 3 | `budget-joint-and-salary.sql` | `budget.joint` flag, and `settings` for net salary |
| 4 | `goals-forecast-columns.sql` | Goal forecast fields, ordering, archiving |
| 5 | `delete-policies.sql` | DELETE policies — without these, deletes silently do nothing |

If something appears not to save, or Delete appears to do nothing, a policy from
one of these files is missing. Row-level security filters a rejected write to
zero rows without raising an error. This query lists what you have:

```sql
select tablename, cmd, policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('monthly_data', 'source', 'goals', 'budget', 'settings')
order by tablename, cmd;
```

Each table should show all four of `SELECT`, `INSERT`, `UPDATE`, `DELETE`.

## Each user sees only their own data

Row-level security scopes every table to the signed-in user. Someone who clones
this and signs up gets an empty tracker — not the data of whoever set it up.
Sharing figures means sharing a login.

## How spend is calculated

Getting this right is most of the work, so the rules are worth stating.

**Pot transfers are excluded in both directions.** Monzo labels internal moves
`Pot transfer`. Money going from the main account into a pot is not spend, and
money coming back out is not income — it is your own money moving between your
own accounts. Counting either would double-count, because the same money is
counted again when it finally reaches a merchant. Excluding both directions means
each pound is counted once, at the point it leaves for something real.

**Refunds net off their category** rather than counting as income. A credit on a
card is money coming back on a purchase, so it reduces that category's spend.

**Salary is matched fuzzily** on the employer name, so `Allvue Systems`,
`390171134allvue S` and similar variants all count as salary rather than
miscellaneous income.

**Savings and one-off payments are shown separately**, each behind a toggle. Both
are real outflows but neither is consumption, and leaving them in makes a normal
month look catastrophic. One-off payments in particular — a visa renewal, a
deposit — would otherwise dominate the average.

**Targets and spend always use the same category set.** When a category is
excluded from spend, budget lines in that category are excluded from the target
too. Otherwise variance drifts by the size of the excluded lines.

**Variance covers only budgeted categories.** While a budget is being built up,
comparing total spend against a target that covers three categories would report
enormous overspending that is really just missing budget lines. The card states
its coverage: "4 of 16 categories budgeted".

## Importing statements

Export from Monzo as CSV and drop it on the Budget tab. The importer:

- reads `Date`, `Local amount`, `Category`, `Type`, and `Name`/`Notes`
- tags a file as a pot statement when the filename contains "pot"
- refuses a filename that is already imported, to prevent duplicates

Deleting a source removes its transactions from the database permanently. The
button confirms first and reports the row count.

Budget spreadsheets are matched loosely on header names — `Bill`, `Name`, `Item`
and `Description` all work for the name column, as do `Target`, `Amount` and
`Budget` for the value. A file with no recognisable header is read by column
order. Leave the category column out and each bill is assigned a category from
those already in your statements, marked as a suggestion for you to correct.

# Expense Tracker — Feature Roadmap & Specs

> Living plan. Created 2026-06-01. Build top-down, one item at a time. Each item
> follows the conventions below (TDD pure logic, verify build). B1 has a full,
> ready-to-implement spec; the rest are sketches to be fleshed out when reached.

## Build order

| # | Feature | Status | Notes / deps |
|---|---------|--------|--------------|
| B1 | Recurring expenses **auto-create** (not just notify) | **NEXT — spec below** | Builds on existing cron; no new infra |
| B2 | Per-category budgets | Planned | Schema add; surfaces on dashboard |
| B3 | Overspend / anomaly alerts | Planned | **Needs B2** + push (exists) |
| C1 | Bulk expense entry | Planned | UI-only |
| C2 | OCR itemized splitting | Planned | Extends Gemini OCR; higher effort |
| C3 | Bank/UPI SMS import (paste/forward parser) | Planned | PWA can't read SMS directly — see sketch |
| D1 | Richer insights | Planned | Extends insights page |
| D2 | Monthly PDF / email report | Planned | **Needs email provider** (Resend) |
| D3 | Scheduled exports | Planned | Shares email infra with D2 |

## Decisions

- **Settlement model — RESOLVED: B (signed-settlement, supports partial payments).**
  Implemented: `friend_balances` view restores the signed-settlement subtraction
  (migration `20250523000000_settlement_signed_balance.sql`); `createSettlement`
  no longer flips shares (FIFO `allocateSettlement` removed); the dashboard
  derives receivable/payable from `friend_balances` net (in `dashboard/page.tsx`).
  - *Follow-up (low priority):* the `get_month_dashboard` RPC still computes
    `to_receive/to_pay/total_outstanding` from month-scoped pending shares; the
    page now ignores those keys. Remove them from the RPC in a later cleanup.
  - *Note:* per-friend ledger now shows shares as always-`pending` + settlement
    entries + a net balance — expected under Model B. UI polish can address this.
- **B1 auto-create assumptions — CONFIRMED** (all four; see B1 §"Decisions").

## Performance (app feels slow on data load)

Root causes diagnosed: (1) redundant `auth.getUser()` network round-trips
(middleware + layout + page + each loader), (2) no streaming — pages block on all
data before any render, (3) heavy eager JS (recharts shipped in the initial
dashboard/insights bundle, no code-splitting).

- **P1 — auth dedupe — DONE (hot paths).** `getCurrentUser()` wraps `getUser()`
  in React `cache()` (`lib/supabase/server.ts`); layout + dashboard + insights +
  expenses/friends/categories/recurring loaders now share one validation per
  render. *Follow-up:* sweep the long-tail render files still using inline
  `getUser()` — `settings/{profile,payment-methods,notifications}`,
  `expenses/new`, `expenses/[id]` (page+actions), `settings/profile/page`,
  `settings/recurring/page`. (API routes `ocr`/`export` intentionally left — separate requests, no dedupe benefit.)
- **P3 — lazy charts — DONE.** recharts extracted to `dashboard/spend-chart.tsx`
  and `insights/monthly-chart.tsx`, loaded via `next/dynamic` (`ssr:false` +
  skeleton) so cards paint before the chart chunk loads.
- **P2 — Suspense streaming — TODO (next).** Render shell instantly; stream data
  sections with skeletons on dashboard/insights/friend-ledger.
- **P4 — cache rarely-changing data** (categories/payment methods fetched every nav). TODO.
- **P5 — move insights year-aggregation into an RPC** (like the dashboard). TODO.

> Not yet measured with live profiling (authenticated pages need a logged-in
> Supabase session). Wins are structural: fewer round-trips + smaller initial JS.

## Conventions (how every item gets built)

- **TDD**: pure logic lives in `lib/*.ts` and is covered by `tests/lib.test.ts`
  (vitest), written test-first (RED → GREEN). Side-effectful glue (server
  actions, routes) stays thin and calls the tested pure functions.
- **Money**: always `bigint` paise; use `lib/money.ts` (`toPaise`/`formatINR`).
- **Dates**: always IST via `lib/dates.ts`; never parse bare strings through
  `new Date(...).toLocale*` (browser-tz drift).
- **SQL**: every schema/function change is a **new** migration file in
  `supabase/migrations/`. Applying to the cloud DB is a manual step (run when
  Docker/local Supabase or the cloud project is available). SECURITY DEFINER
  functions must `set search_path = public, pg_temp` and validate ownership.
- **Verify** before "done": `npx vitest run`, `npx tsc --noEmit`, `npm run build`.

---

## B1 — Recurring expenses auto-create

### Problem
Recurring expenses only *notify* that something is due. The cron advances
`next_run_at` and sends a push, but never creates an actual expense, so recurring
costs (rent, subscriptions) don't appear in totals/insights unless added by hand.

### Current behavior
- Table `recurring_expenses`: `id, user_id, amount_paise, category_id,
  payment_method_id, cadence ('daily'|'weekly'|'monthly'|'yearly'), next_run_at,
  note, is_active`.
- Cron `GET /api/notifications/recurring` (daily 09:00 IST via `vercel.json`):
  finds `is_active AND next_run_at <= now`, advances `next_run_at`
  (`computeNextRunUTC`), and sends a "due" push if the user opted in.

### Goal
When a recurring expense is due, **create a real `expenses` row** from the
template (and notify in the past tense). Catch up any missed periods. Be
idempotent so a cron retry can't double-create.

### Design

**1. Migration** (`supabase/migrations/<ts>_recurring_autocreate.sql`)
- `alter table public.expenses add column recurring_id uuid references public.recurring_expenses(id) on delete set null;`
- Dedupe guard: `create unique index expenses_recurring_period_uniq on public.expenses (recurring_id, spent_at) where recurring_id is not null;`
  → a repeated insert for the same template+period is rejected, making the cron idempotent.

**2. Pure logic** (`lib/recurring.ts`, TDD)
```
planRecurringRuns(nextRunAtISO, cadence, nowISO, cap = 60)
  -> { runs: string[] /* due period instants, oldest→newest */, nextRunAt: string }
```
- Walk `cursor = nextRunAt`; while `cursor <= now` and `runs.length < cap`,
  push `cursor` and advance via `computeNextRunUTC(cursor, cadence)`.
- `cap` prevents runaway catch-up (e.g. a long-dormant daily). Returns the new
  `nextRunAt` to persist. Reuses the already-tested `computeNextRunUTC`.

**3. Cron change** (`app/api/notifications/recurring/route.ts`)
For each due recurring: `const { runs, nextRunAt } = planRecurringRuns(...)`.
- Insert one `expenses` row per `run`: `{ user_id, amount_paise, spent_at: run,
  category_id, payment_method_id, note, paid_by: null, is_split: false,
  recurring_id: r.id }` using `.upsert(..., { onConflict: 'recurring_id,spent_at', ignoreDuplicates: true })`.
- Update `next_run_at = nextRunAt`.
- Notification copy → past tense: `"Added recurring: <note> — <amount>"`
  (`runs.length` of them), still gated by `notify_recurring_due`.

### Decisions & assumptions (confirm or override)
1. **Scope**: auto-create applies to **all** active recurring expenses (no
   per-item opt-out for v1). *Add a toggle later if needed.*
2. **Catch-up**: create **one expense per missed period** (capped at 60), so
   history is accurate — not a single lump.
3. **`spent_at`** = the scheduled due instant, not the cron run time.
4. **Splits**: recurring templates have no shares today, so created expenses are
   personal (`is_split=false`, `paid_by=null`). Recurring splits = future work.

### Task list
- [ ] Migration: `recurring_id` column + dedupe unique index.
- [ ] `lib/recurring.ts`: `planRecurringRuns` (+ vitest: no-run, single, multi-period catch-up, cap).
- [ ] Cron: materialize via `planRecurringRuns`, upsert-ignore-dupes, advance, past-tense notify.
- [ ] Verify: vitest + tsc + build. Apply migration to cloud (manual).

### Test plan
- `planRecurringRuns`: nothing due (`nextRun` in future) → `runs: []`, unchanged.
- Exactly due → one run, advanced once.
- Daily, 3 days overdue → 3 runs, `nextRunAt` past `now`.
- Cap respected for far-overdue.
- (Manual) cron run twice → no duplicate expenses (unique index holds).

---

## B2 — Per-category budgets (sketch)
- **Goal**: monthly budget per category (today only a single `monthly_budget_paise`).
- **Approach**: new `category_budgets` table (or `budget_paise` column on
  `categories`) keyed by `user_id, category_id`. Dashboard shows spent-vs-budget
  bars per category; reuse the IST month window from `get_month_dashboard`.
- **Open**: budgets as rollover or strict per-month? UI on dashboard or settings?

## B3 — Overspend / anomaly alerts (sketch, needs B2)
- **Goal**: push when a category exceeds (or is on track to exceed) its budget,
  or when spend is anomalous vs the category's trailing average.
- **Approach**: daily cron checks current-month category spend vs B2 budgets;
  send via existing `sendPushToUser`; add `notify_overspend` profile flag.
- **Open**: threshold model (hard limit vs % of pace vs stdev anomaly)?

## C1 — Bulk expense entry (sketch)
- **Goal**: add several expenses quickly (e.g. after a trip).
- **Approach**: client form with add-row repeater → one server action that
  validates all rows (zod) and inserts in a batch.

## C2 — OCR itemized splitting (sketch)
- **Goal**: extend `/api/ocr` (Gemini) to return **line items**, then let the
  user assign each item to friends → generates shares.
- **Approach**: structured prompt → `{ items: [{name, amount_paise}], total }`;
  new assignment UI; build shares from selections. Higher effort.

## C3 — Bank/UPI SMS import (sketch)
- **Constraint**: a PWA can't read SMS (esp. iOS). So **not** auto-read.
- **Approach options**: (a) paste-SMS box → parse common bank/UPI formats into a
  prefilled expense; (b) forward-to-email address → inbound webhook parses.
  Start with (a) — zero infra, India bank-SMS regex library.

## D1 — Richer insights (sketch)
- **Goal**: extend insights (category trends, top merchants, week/day-of-week
  patterns, split vs personal). Pure data-shaping over existing queries.

## D2 / D3 — Monthly PDF/email report + scheduled exports (sketch)
- **Shared dep**: an email provider (Resend recommended) + `RESEND_API_KEY`.
- **D2**: monthly cron renders a summary (HTML→PDF or styled email) and emails it.
- **D3**: scheduled CSV export (extends existing `/api/export`) emailed or stored
  in Vercel Blob; user picks cadence.
- Do D2 + D3 together once email infra exists.

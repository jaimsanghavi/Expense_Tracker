# Product Requirements Document
# Personal Daily Expense Tracker (INR)

**Version:** 1.3
**Date:** May 2026
**Owner:** Product Owner (You)
**Status:** MVP built — in polish phase

---

## 0. Implementation Status

### Completed (MVP)

| Feature | User Story | Notes |
|---|---|---|
| Auth (email/password login) | P0-1 | Supabase Auth, cookie sessions, middleware gate |
| Expense CRUD | P0-2, P0-4 | Add/edit/delete with full form validation |
| Expense list with filters | P0-3 | Month, category, payment method, text search, infinite scroll |
| Category management | P0-5 | Create/edit/delete, icon picker (80+ Lucide), color picker |
| Payment method management | P0-6 | Create/edit/delete, type-specific icons |
| Splitting with friends | P0-7 | Equal/custom split, share status tracking |
| Per-friend balance | P0-8 | Net owed displayed in friend list |
| Mark shares paid/gift | P0-9 | Status updates on expense shares |
| Monthly dashboard | P0-10 | KPI tiles, stacked bar chart, top categories, month picker |
| Search expenses | P1-15 | Text filter in expense list |
| Dark mode | P2-19 | Default dark theme, oklch color system |
| Database schema + RLS | — | Full schema, all tables RLS-enabled, seed data |
| Profile settings | — | Display name, monthly budget |
| Friend ledger | — | Per-friend chronological expense/share history |
| Recurring expenses | P1-11 | Full CRUD UI in Settings, cadence selection, active/inactive toggle |
| Monthly CSV export | P1-14 | Download button in expenses list, route handler at /api/export |
| Settlement recording | P1-13 | Settle Up dialog in friend ledger page, FIFO share marking |
| Receipt upload | P1-12 | Upload/view/delete in expense detail, Supabase Storage with RLS |
| Budget tracking | P2-16 | Progress bar on dashboard "Spent" card, color-coded overspend warning |
| Yearly insights | P2-18 | /insights page with yearly bar chart, category/PM breakdown, MoM table |

### Pending

| Feature | User Story | Priority | Notes |
|---|---|---|---|
| Notifications | — | Phase 3 | Web push for large expenses, recurring reminders |

### Discarded

| Feature | Reason |
|---|---|
| Capacitor Android | PWA provides installability, offline, and camera — sufficient for single-user app |

### Recently Completed

| Feature | User Story | Notes |
|---|---|---|
| PWA / offline | — | Service worker, manifest, icons, installable from browser |
| Receipt OCR | P2-17 | Gemini 2.5 Flash vision, auto-fill form, HEIC support |
| Quick-add FAB | §5.2 | Floating button on every screen, minimal modal |

---

## 1. Executive Summary

A private, **strictly single-user** web application to log daily expenses in INR, classify them by payment method (UPI, Credit Card, Cash, Debit Card, Net Banking, Wallet) and category (Food, Travel, Bills, etc.), and manage money split with friends — tracking who owes whom, supporting partial settlements, and marking shares as *Paid*, *Gift*, or *Pending*.

The system is built as a Next.js application hosted on **Vercel**, backed by **Supabase** (Postgres + Auth + Storage + Realtime). Security is enforced primarily through **Supabase Row Level Security (RLS)** so data is invisible to anyone except its owner, even at the database layer.

A clear path to an Android app is included, with a recommendation to ship via **Capacitor** (reusing the same web codebase) for the fastest, lowest-cost route.

---

## 2. Goals & Non-Goals

### 2.1 Goals
- Log an expense in under 10 seconds from the home screen.
- Always-correct INR arithmetic (no floating-point bugs in totals).
- Know at any moment: *how much I spent this month, by category, by payment method*.
- Know at any moment: *who owes me money, who I owe, and how much*.
- Be private — only the authenticated owner can read their data.
- Be deployable on a free or cheap tier (Vercel Hobby + Supabase Free) for personal use.

### 2.2 Non-Goals (v1)
- Multi-currency. INR only.
- **Multi-user / household sharing. App is single-owner. No `household_id`, no sharing layer, ever.**
- Bank account auto-sync / SMS scraping.
- Group trip splitting (Splitwise-style multi-payer groups). v1 is *I paid, friend X owes me share Y*.
- **Cash wallet balance tracking. "Cash" is purely a payment-method label; no running cash balance is maintained.**
- **Historical CSV import. Will be considered later as part of the export/ledger work.**
- Tax reports / GST handling.
- Receipt OCR (optional in v2).

---

## 3. Target User

Exactly one user: **you**. No partner, no family, no shared household — confirmed and locked.

This is a meaningful simplification: no `household_id` column anywhere, no sharing UI, no permissions beyond "is this row mine?". Supabase Auth signup remains disabled at the project level — the single account is provisioned manually and that is the only account that will ever exist.

---

## 4. User Stories (Prioritised)

### P0 — Must have for MVP
1. As a user, I can sign in securely so nobody else can see my data.
2. As a user, I can add an expense with: amount, date, category, payment method, optional note.
3. As a user, I can view a chronological list of my expenses, filterable by month, category, and payment method.
4. As a user, I can edit or delete any expense.
5. As a user, I can manage my categories (create/edit/delete/colour/icon).
6. As a user, I can manage my payment methods (e.g. "HDFC Credit Card", "Paytm UPI", "Cash Wallet").
7. As a user, I can mark an expense as *split with friends*, specifying which friends and each friend's share.
8. As a user, I can see a per-friend balance (net owed to me / by me).
9. As a user, I can mark a friend's share as *Paid* (settled) or *Gift* (forgiven).
10. As a user, I see a monthly dashboard: total spent, breakdown by category, by payment method.

### P1 — Soon after MVP
11. As a user, I can add recurring expenses (rent, subscriptions).
12. As a user, I can attach a receipt image to an expense.
13. As a user, I can record a settlement from a friend ("Rahul paid me ₹500 cash for last week's dinner").
14. **As a user, I can export a single month's data as a CSV ledger (all expenses + shares + settlements for that month), so it can be archived or imported back later.**
15. As a user, I can search expenses by text.

### P2 — Later
16. Budgets per category with overspend alerts.
17. Receipt OCR for auto-fill.
18. Yearly insights and trends.
19. Dark mode (likely defaulted on from day one anyway).

---

## 5. Functional Requirements

### 5.1 Authentication
- Email + password, with email confirmation via Supabase Auth.
- **Magic link** option for passwordless login on trusted devices.
- Optional **TOTP 2FA** (Supabase MFA) — strongly recommended given financial data.
- Session lifetime: 7 days sliding refresh; force re-login after 30 days.
- Signup is **disabled by default** in Supabase Auth settings; the owner is provisioned manually. To allow a partner, add them via the Supabase dashboard or an admin-only invite flow.

### 5.2 Expense Entry
- Required fields: `amount` (INR, two decimals), `spent_at` (datetime, defaults to now), `category_id`, `payment_method_id`.
- Optional: `merchant`, `note`, `receipt_url`, `is_split`, `tags[]`.
- INR formatting: Indian numbering with lakhs/crores grouping in display (`₹1,23,456.78`).
- Money stored as **integer paise** in the database (`bigint`) to avoid float errors. Application layer converts to/from rupees for display.
- Quick-add: a floating button on every screen opens a minimal modal that needs only amount + category (defaults handle the rest).

### 5.3 Categories
- Pre-seeded defaults on first login: Food & Dining, Groceries, Transport, Fuel, Bills & Utilities, Rent, Shopping, Entertainment, Health, Education, Travel, Personal Care, Gifts, Investments, Misc.
- User can rename, recolour, change icon, archive, or delete (only if unused; otherwise soft-delete).
- Categories are per-user — no global list.

### 5.4 Payment Methods
- Types: `upi`, `credit_card`, `debit_card`, `cash`, `net_banking`, `wallet`, `other`.
- Fields: display name, type, optional `last_four` (for cards), optional `provider` (e.g. "HDFC", "GPay", "Paytm").
- For credit cards: optional `billing_cycle_day` and `due_day` so future versions can warn about due dates.
- No card numbers, CVVs, or sensitive details are ever stored. Only the last four digits and a display name.

### 5.5 Splitting with Friends

**Friend (contact) model:** lightweight — name, optional phone, optional email, optional UPI handle. No login required for friends; they are just labels on your data.

**Split flow:**
1. While entering an expense, user toggles "Split this expense".
2. Selects one or more friends.
3. Chooses split mode:
   - **Equal** — divide total equally among (user + selected friends) or only the friends if user paid for them.
   - **Custom amount** — type exact share per person.
   - **Custom percentage** — assign % per person.
4. User indicates who paid:
   - *I paid* (default) → friends owe their share to me.
   - *Friend paid* → I owe that friend my share (this is recorded as a *liability* expense — friend's share equals my outflow).
5. Each split share has a status: `pending`, `paid`, `gift`.
6. The arithmetic must always balance: sum of shares = total expense amount, enforced at the application layer and via a database `CHECK` constraint or trigger.

**Settlement flow:**
- A friend pays me back → I open their balance, hit *Settle*, choose amount and method (UPI / Cash / etc.). The system marks the oldest pending shares as paid up to that amount (FIFO) and stores a settlement record.
- Mark as Gift → that share is closed without payment, recorded with `status = 'gift'` and an optional note. **A gifted share still counts as money I spent** (it remains in dashboard totals); it only stops being a receivable.
- Per-friend ledger view: chronological list of all shared expenses + settlements, running balance, total outstanding.

### 5.6 Dashboard

The dashboard is the **home screen** after login. Default view is the current month (IST). A month picker in the header lets the user jump back; filters (category, payment method) refine all tiles and charts together.

#### 5.6.1 KPI tiles (top row)

Three primary tiles, sized large, always visible:

| Tile | Definition (in plain words) | SQL shape |
|---|---|---|
| **Spent this month** | Sum of every expense I paid for, where `spent_at` falls in the selected month. Split status is irrelevant — gifts, pending shares, paid shares all count. This is "money that left my hands". | `sum(amount_paise) from expenses where user_id = me and paid_by is null and spent_at in [month]` |
| **To be received this month** | Sum of pending shares (`status = 'pending'`) on expenses I paid for that are dated within the selected month. This is "money friends owe me from this month's spending". | `sum(es.share_paise) from expense_shares es join expenses e on e.id = es.expense_id where es.user_id = me and es.status = 'pending' and e.paid_by is null and e.spent_at in [month]` |
| **To pay this month** | Sum of pending shares on expenses where a friend paid for me, dated within the selected month. "Money I owe friends from this month". | `sum(es.share_paise) ... where e.paid_by is not null and e.spent_at in [month]` |

A secondary row of smaller tiles, less prominent:
- **Total outstanding (all-time)** — what you'd collect today if every pending share were settled, regardless of month. Useful because old debts don't vanish at month boundaries.
- **Largest category this month** — quick glance at where the money went.
- **Largest single expense** — flags unusually big spends.

All money is fetched as paise and formatted client-side via `formatINR()`.

#### 5.6.2 Spend Analyzer (primary chart)

A single, switchable analytical chart — *not* three separate small ones. It occupies the full width below the tiles.

**Layout:**
- **Stacked bar chart** by default. X-axis: days of the selected month. Y-axis: total spend that day in ₹. Stacks: top N categories (e.g. top 6) plus an "Other" stack.
- Hovering a bar shows a tooltip with the breakdown for that day.
- Clicking a day filters the expenses list view to that day.

**Dimension toggle** (segmented control above the chart):
- *By Category* (default)
- *By Payment Method*
- *Split vs Solo* (two stacks: shared expenses vs personal)

**Time grain toggle:**
- *Daily* (default for current month)
- *Weekly* (useful when viewing past months together — out of scope for v1 single-month view but planned for v2 year-view)

**Below the chart**, a compact "top movers" panel:
- Top 5 categories with horizontal bars showing each category's share of monthly spend, sorted desc.
- Each row links to a filtered expense list.

#### 5.6.3 Secondary widgets

- **Payment-method strip** — small horizontal stacked bar showing what share of the month went via UPI / Card / Cash / etc. One row, no axis labels — just a colour ribbon with a legend.
- **Recent activity** — last 5 expenses, with quick-edit buttons.
- **Friend balances summary** — top 3 friends by absolute outstanding amount, linking to their ledger.

#### 5.6.4 Edge cases
- A month with zero expenses shows an empty-state illustration on the chart, but the tiles still render `₹0.00`.
- A user with zero friends hides the receivables/payables tiles entirely — never show `₹0` for a feature that doesn't apply.
- All numbers are computed server-side in a single Postgres function (`get_month_dashboard(month_start date)`) returning a JSON aggregate, so the dashboard is one round trip.

### 5.7 Lists & Search
- Expenses list: virtualised, infinite-scroll, grouped by date.
- Each row shows: amount, category icon, payment method chip, split indicator if applicable.
- Tap to view detail / edit.
- Search bar filters by note, merchant, friend name.

### 5.8 Notifications (P1)
- Web push (via Supabase Edge Function + service worker) for: large expense flags (>₹X), friend balance crossing a threshold, recurring expenses due.

---

## 6. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Home screen interactive in < 1.5s on 4G. Add-expense round trip < 400ms. |
| Availability | Best-effort. Single Vercel + single Supabase region (Mumbai). |
| Security | RLS-enforced, HTTPS-only, no client-side service keys, 2FA optional. |
| Privacy | No analytics on personal financial values. Anonymous page-view analytics only (PostHog/Plausible) — opt-in. |
| Accessibility | WCAG 2.1 AA targets: keyboard nav, contrast, screen-reader labels. |
| i18n | INR + en-IN locale fixed for v1. |
| Offline | PWA cache shell so the app opens offline; queued writes sync on reconnect (P1). |

---

## 7. Data Model

All money is stored as **`bigint` paise** (1 INR = 100 paise).
Timestamps are `timestamptz` in UTC; rendered in IST (`Asia/Kolkata`) on the client.

### 7.1 Tables

```sql
-- Supabase Auth manages auth.users automatically.
-- All app tables reference auth.users(id).

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  default_currency text not null default 'INR',
  monthly_budget_paise bigint
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,                       -- icon key (lucide name)
  color text,                      -- hex
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create type payment_method_type as enum
  ('upi','credit_card','debit_card','cash','net_banking','wallet','other');

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type payment_method_type not null,
  provider text,
  last_four text check (last_four is null or last_four ~ '^[0-9]{4}$'),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  upi_handle text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_paise bigint not null check (amount_paise > 0),
  spent_at timestamptz not null default now(),
  category_id uuid references public.categories(id) on delete set null,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  merchant text,
  note text,
  receipt_path text,               -- supabase storage path
  is_split boolean not null default false,
  paid_by uuid references public.friends(id) on delete set null,
                                   -- null = the user paid; otherwise the friend who paid
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type share_status as enum ('pending','paid','gift');

create table public.expense_shares (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
                                   -- denormalised owner for fast RLS
  friend_id uuid not null references public.friends(id) on delete cascade,
  share_paise bigint not null check (share_paise > 0),
  status share_status not null default 'pending',
  settled_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references public.friends(id) on delete cascade,
  amount_paise bigint not null check (amount_paise > 0),
  direction text not null check (direction in ('from_friend','to_friend')),
  method payment_method_type,
  note text,
  settled_at timestamptz not null default now()
);

create table public.recurring_expenses (   -- P1
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_paise bigint not null,
  category_id uuid references public.categories(id),
  payment_method_id uuid references public.payment_methods(id),
  cadence text not null check (cadence in ('daily','weekly','monthly','yearly')),
  next_run_at timestamptz not null,
  note text,
  is_active boolean not null default true
);

-- Useful indexes
create index on public.expenses (user_id, spent_at desc);
create index on public.expenses (user_id, category_id);
create index on public.expense_shares (user_id, friend_id, status);
create index on public.settlements (user_id, friend_id, settled_at desc);
```

### 7.2 Integrity rule for splits

The sum of `expense_shares.share_paise` for an expense should equal `expenses.amount_paise` (when the user paid for the whole thing) or the user's portion (when a friend paid). Enforce in the application layer inside a transaction. Optionally add a deferred trigger:

```sql
create or replace function check_shares_sum() returns trigger as $$
declare total bigint; expense_total bigint;
begin
  select coalesce(sum(share_paise),0) into total
    from expense_shares where expense_id = new.expense_id;
  select amount_paise into expense_total from expenses where id = new.expense_id;
  if total > expense_total then
    raise exception 'Sum of shares (%) exceeds expense total (%)', total, expense_total;
  end if;
  return new;
end;
$$ language plpgsql;

create constraint trigger trg_shares_sum
  after insert or update on expense_shares
  deferrable initially deferred
  for each row execute function check_shares_sum();
```

### 7.3 Row Level Security (the most important security layer)

Enable RLS on every table and write policies so each user can only see their own rows.

```sql
alter table profiles            enable row level security;
alter table categories          enable row level security;
alter table payment_methods     enable row level security;
alter table friends             enable row level security;
alter table expenses            enable row level security;
alter table expense_shares      enable row level security;
alter table settlements         enable row level security;
alter table recurring_expenses  enable row level security;

-- Pattern: each table has a user_id; user can do anything to their own rows.
create policy "own rows - select" on expenses
  for select using (auth.uid() = user_id);
create policy "own rows - insert" on expenses
  for insert with check (auth.uid() = user_id);
create policy "own rows - update" on expenses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows - delete" on expenses
  for delete using (auth.uid() = user_id);
-- Repeat the same four policies for every other table.
```

RLS means even if an attacker steals the public `anon` key and crafts arbitrary queries, Postgres itself refuses to return another user's data — defence in depth.

---

## 8. Architecture

### 8.1 High-level

```
   ┌─────────────────────┐         ┌─────────────────────────────┐
   │  Browser / PWA /    │  HTTPS  │   Next.js (App Router)      │
   │  Capacitor Android  │ ──────► │   Hosted on Vercel          │
   └─────────────────────┘         │  - React Server Components  │
                                   │  - Server Actions / Route   │
                                   │    Handlers                 │
                                   │  - Middleware (auth gate)   │
                                   └──────────────┬──────────────┘
                                                  │
                                   Supabase JS    │  TLS
                                   (anon key on   │
                                    client; SSR   ▼
                                    cookie auth)
                                  ┌────────────────────────────────┐
                                  │   Supabase (Mumbai region)     │
                                  │  - Postgres + RLS              │
                                  │  - Auth (email, magic, MFA)    │
                                  │  - Storage (receipts)          │
                                  │  - Edge Functions (cron, push) │
                                  │  - Realtime (optional)         │
                                  └────────────────────────────────┘
```

### 8.2 Frontend stack
- **Next.js 14+** with App Router and React Server Components.
- **TypeScript** end to end.
- **Tailwind CSS** + **shadcn/ui** for components.
- **lucide-react** for icons.
- **React Hook Form** + **Zod** for forms and validation.
- **TanStack Query** for client cache of frequently re-fetched lists (or just RSC + revalidation — depends on interactivity needs).
- **Recharts** for the dashboard charts.
- **date-fns** + **date-fns-tz** for IST date handling.
- **next-pwa** to make it installable.

### 8.3 Backend / data access
- All data access uses the Supabase JS client.
- On the server (RSC, route handlers, server actions): use `@supabase/ssr` to create a cookie-aware client that runs as the logged-in user. RLS is enforced; the server holds no extra privileges.
- The `service_role` key is **never** sent to the browser. It is used only inside Supabase Edge Functions or one-off admin scripts.
- Heavy logic (settlement FIFO matching, share-sum validation) lives in:
  - A Postgres function called via `rpc()`, **or**
  - A server action that runs inside a transaction.

### 8.4 Folder layout (suggested)

```
app/
  (auth)/login/page.tsx
  (auth)/callback/route.ts
  (app)/
    layout.tsx                # protected layout — redirects if not signed in
    dashboard/page.tsx
    expenses/page.tsx
    expenses/[id]/page.tsx
    expenses/new/page.tsx
    friends/page.tsx
    friends/[id]/page.tsx     # per-friend ledger
    settings/categories/page.tsx
    settings/payment-methods/page.tsx
    settings/profile/page.tsx
  api/                        # only if you need pure REST endpoints
middleware.ts                 # auth gate
lib/
  supabase/server.ts
  supabase/client.ts
  money.ts                    # paise <-> rupee, formatting
  splits.ts                   # split arithmetic
components/
  ui/...                      # shadcn
  forms/...
  charts/...
db/
  migrations/...              # Supabase migrations
  seed.sql                    # default categories
```

### 8.5 Deployment
- Git push to `main` → Vercel preview deploy → manual promote to production, or auto-deploy on tagged release.
- Two Supabase projects: **dev** and **prod**. Different `SUPABASE_URL` and keys per Vercel environment.
- Migrations managed by the Supabase CLI (`supabase migration new ...`, `supabase db push`).

---

## 9. Security Design

Single-user financial data warrants taking this seriously. Layers:

| Layer | Control |
|---|---|
| Transport | HTTPS everywhere; HSTS preload via Vercel. |
| Auth | Supabase Auth with email confirmation. Optional TOTP MFA. Magic-link as a convenience option. |
| Signup | Disabled at the Supabase Auth level — you provision yourself; no public route accepts new users. |
| Session | HTTP-only, Secure, SameSite=Lax cookies via `@supabase/ssr`. Refresh tokens rotate. |
| AuthZ | Postgres RLS on every table — the single source of truth for "who can read what". |
| Keys | Only the `anon` public key reaches the browser. `service_role` lives in Vercel env vars used only by trusted server code or Edge Functions. |
| Validation | Every server action / route handler validates input with Zod *before* hitting the DB. |
| Storage | Receipt images stored in a private Supabase Storage bucket with RLS-equivalent policies; access via short-lived signed URLs. |
| Headers | `Content-Security-Policy`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` minimal. Configure in `next.config.js` headers. |
| Rate limits | Use Vercel's built-in rate limiting on auth endpoints; add an Upstash Ratelimit middleware on write-heavy routes if needed. |
| Logging | Supabase logs all auth events. Avoid logging amounts or notes in your own logs. |
| Secrets | Store in Vercel env vars; never commit `.env`; `.env.local` git-ignored. |
| Backups | Supabase daily backups on paid tier; for free tier, schedule a weekly `pg_dump` via an Edge Function uploading to private storage. |
| Device | Recommend a password manager and OS-level disk encryption — the realistic attack surface for a personal app is your own device. |

### 9.1 Threat model (brief)
- **Stolen session token** → mitigated by short refresh window + MFA.
- **Stolen `anon` key** → useless without a valid JWT because of RLS.
- **XSS** → Next.js auto-escapes; never use `dangerouslySetInnerHTML`; CSP blocks inline scripts.
- **CSRF** → Server actions in Next.js are not vulnerable to classic CSRF (they require same-origin and a framework token); avoid plain mutating GET endpoints.
- **Malicious dependency** → pin versions; enable Dependabot; lock with `pnpm-lock.yaml`.

---

## 10. Key UI Screens

1. **Login** — email + password, magic-link option, MFA challenge step.
2. **Dashboard** — month tiles, charts, recent expenses, quick-add FAB.
3. **Expenses list** — filters, search, date groups, infinite scroll.
4. **Add / edit expense** — single form, split section collapsible.
5. **Expense detail** — full info, split breakdown with per-share status pills.
6. **Friends list** — net balance per friend, sorted by absolute amount.
7. **Friend ledger** — chronological expenses + settlements, big "Settle up" button.
8. **Settings** — Categories, Payment methods, Profile, Security (MFA enrol), Export.

Design language: dark-first, dense but legible, big tap targets (≥44px) for the eventual mobile app, INR amounts always right-aligned in monospaced tabular figures.

---

## 11. Android Strategy

Three viable paths, ranked by effort vs payoff:

### Option A — PWA only (lowest effort)
- Add a manifest, icons, and a service worker via `next-pwa`.
- Users install from Chrome via "Add to Home Screen".
- Works offline for already-loaded screens; writes can be queued with IndexedDB + Background Sync.
- Pros: zero extra build, instant updates.
- Cons: no Play Store presence, no native camera-roll integration on older Android, no push on iOS (irrelevant here but worth noting).

### Option B — Capacitor wrapper (recommended)
- Install `@capacitor/core` and `@capacitor/android`.
- Configure Capacitor to load your deployed Vercel URL (or bundle a static export with `next export` for offline-first).
- Add native plugins as needed: `@capacitor/camera` (receipt photos), `@capacitor/preferences`, `@capacitor/push-notifications` (via Firebase).
- Build an APK / AAB and publish to the Play Store.
- **Pros:** ~95% code reuse, real Play Store app, real push, native camera. Fastest route to a "real" Android app.
- **Cons:** Slightly heavier than pure native; some screens may feel web-like (mitigated with good CSS).

### Option C — React Native / Expo rewrite
- Reuse business logic (`splits.ts`, `money.ts`, Supabase calls, Zod schemas) by extracting into a shared `packages/core`.
- Rebuild UI in React Native components.
- **Pros:** Fully native feel.
- **Cons:** Significant extra work; two UIs to maintain. Only worth it if the app becomes commercial.

**Recommendation:** Ship the web app first, immediately PWA-enable it, then wrap with Capacitor when an installable Android app becomes a priority. Keep all business logic platform-agnostic from day one so a React Native rewrite stays cheap if ever needed.

### Mobile-specific considerations baked into v1
- Layouts use a mobile-first responsive grid.
- All forms operate fine on a 360px-wide screen.
- Numeric inputs use `inputMode="decimal"` to surface the right keyboard.
- The quick-add modal is one-thumb operable.
- Auth uses cookie-based sessions which Capacitor handles cleanly via the in-app browser.

---

## 12. Tech Stack Summary

| Layer | Choice |
|---|---|
| Frontend framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | lucide-react |
| Server data | Supabase JS (`@supabase/ssr` + `@supabase/supabase-js`) |
| Database | Supabase Postgres |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Hosting | Vercel |
| Region | Supabase Mumbai (ap-south-1) |
| PWA | `next-pwa` |
| Android (later) | Capacitor + Android Studio |
| Analytics (opt-in) | Plausible or PostHog (self-hosted, anonymised) |
| Error tracking | Sentry (free tier) |
| CI | Vercel previews + GitHub Actions for lint/typecheck/tests |
| Tests | Vitest (unit), Playwright (e2e on critical paths) |

---

## 13. Environment Variables

| Name | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Admin tasks / Edge Functions. Never expose. |
| `SUPABASE_DB_PASSWORD` | Local dev only | For Supabase CLI migrations. |
| `NEXT_PUBLIC_SITE_URL` | Browser + server | Used in auth redirect URLs. |
| `SENTRY_DSN` | Server | Optional error tracking. |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Server | If using rate limiting. |

---

## 14. Build Phases / Roadmap

### Phase 0 — Foundations (Week 1) ✅
- Repo, CI, Vercel project, Supabase project, environment wiring.
- Auth flow + protected layout + base UI.

### Phase 1 — MVP (Weeks 2–3) ✅
- Schema + RLS + seed.
- Expense CRUD, categories, payment methods.
- Friends, splits, mark paid / gift.
- Per-friend ledger.
- Monthly dashboard.

### Phase 2 — Polish (Week 4) ⏳ In Progress
- ~~Receipts upload.~~ (pending)
- ~~**Monthly ledger CSV export**~~ ✅ (route handler + download button in expense list).
- PWA install + offline shell.
- 2FA / MFA enrolment.
- ~~Recurring expenses.~~ ✅ (Settings UI with full CRUD).

### Phase 3 — Android wrapper (Week 5)
- Capacitor setup.
- Native camera plugin for receipts.
- Push notifications via FCM.
- Internal track release on Play Console.

### Phase 4 — Niceties
- Budgets, alerts, search, dark/light themes, year-in-review.

---

## 15. Acceptance Criteria (MVP)

- Adding an expense persists after refresh and appears in the right month bucket.
- Editing or deleting an expense respects RLS — confirmed by attempting the action while signed in as a second test user.
- A split expense correctly sums to the original amount.
- Marking a share as paid changes the per-friend net balance immediately.
- Marking a share as gift removes it from the outstanding balance without recording a settlement.
- Dashboard totals match the sum of underlying expenses for the selected month, to the paisa.
- Logging out clears the session cookie; visiting `/dashboard` after logout redirects to `/login`.
- Signing in from a new device requires either the password (and MFA if enabled) or a magic link.

---

## 16. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Floating-point money errors | Store as paise integers. Centralise conversion in `lib/money.ts`. Unit-test edge cases. |
| RLS misconfigured on a new table | Add a CI check that fails if `pg_tables` shows any `public` table with `rowsecurity = false`. |
| Forgotten password locking you out | Configure a recovery email at Supabase project level; keep a printed backup MFA code. |
| Vercel / Supabase free tier limits hit | Monitor usage; the personal scale won't approach limits, but enable budget alerts. |
| Supabase region outage | Daily logical backup to private Storage; can be restored elsewhere if needed. |
| Receipt image privacy | Private bucket + signed URLs; never store EXIF GPS — strip on upload server-side. |

---

## 17. Resolved Decisions (Decision Log)

The questions that were open in v1.0 have been settled. They are recorded here so future "what about…" discussions don't reopen closed doors:

| # | Question | Decision | Implication |
|---|---|---|---|
| 1 | Will any non-owner ever log in? | **No.** Strictly single-user, forever. | No `household_id`, no sharing model, no invite flow. Supabase signup stays disabled. |
| 2 | Are gifted shares excluded from "Total spent"? | **No — gifts count as spend.** | Dashboard "Total spent" includes gifted shares. Only "Net owed to me" excludes them (status filter `pending` only). |
| 3 | Historical CSV import on day one? | **No.** | Defer. Build *monthly ledger export* in Phase 2; design the CSV format so the same schema can drive a future import path. |
| 4 | Maintain a running "Cash wallet" balance? | **No.** | "Cash" is purely a `payment_method_type` label. No wallet table, no balance arithmetic, no decrementing logic. |

---

## 18. Appendix — Sample Code Sketches

### 18.1 Money utility

```ts
// lib/money.ts
export const toPaise = (rupees: number | string) =>
  Math.round(Number(rupees) * 100);

export const toRupees = (paise: number) => paise / 100;

const inrFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export const formatINR = (paise: number) => inrFmt.format(toRupees(paise));
```

### 18.2 Equal split

```ts
// lib/splits.ts
// Splits `totalPaise` equally among `n` people, distributing the remainder
// paisa-by-paisa to the first few shares so the sum exactly equals total.
export function splitEqual(totalPaise: number, n: number): number[] {
  if (n <= 0) throw new Error('n must be > 0');
  const base = Math.floor(totalPaise / n);
  const remainder = totalPaise - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}
```

### 18.3 Server action — create expense with shares

```ts
// app/(app)/expenses/new/actions.ts
'use server';

import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const Schema = z.object({
  amountPaise: z.number().int().positive(),
  spentAt: z.string().datetime(),
  categoryId: z.string().uuid().nullable(),
  paymentMethodId: z.string().uuid().nullable(),
  note: z.string().max(500).optional(),
  shares: z
    .array(
      z.object({
        friendId: z.string().uuid(),
        sharePaise: z.number().int().positive(),
      }),
    )
    .optional(),
});

export async function createExpense(input: unknown) {
  const data = Schema.parse(input);
  const supabase = createSupabaseServerClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Unauthenticated');

  if (data.shares?.length) {
    const sum = data.shares.reduce((a, s) => a + s.sharePaise, 0);
    if (sum > data.amountPaise) throw new Error('Shares exceed total');
  }

  // Insert expense + shares in one RPC for atomicity.
  const { error } = await supabase.rpc('create_expense_with_shares', {
    p_amount_paise: data.amountPaise,
    p_spent_at: data.spentAt,
    p_category_id: data.categoryId,
    p_payment_method_id: data.paymentMethodId,
    p_note: data.note ?? null,
    p_shares: data.shares ?? [],
  });
  if (error) throw error;

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
}
```

### 18.4 Per-friend balance view

```sql
create or replace view public.friend_balances as
select
  f.user_id,
  f.id as friend_id,
  f.name,
  coalesce((
    select sum(case when status = 'pending' then share_paise else 0 end)
    from expense_shares es
    where es.friend_id = f.id and es.user_id = f.user_id
  ), 0)
  - coalesce((
    select sum(case when direction = 'from_friend' then amount_paise else 0 end)
    from settlements s
    where s.friend_id = f.id and s.user_id = f.user_id
  ), 0) as net_owed_to_me_paise
from friends f;

-- Positive => friend owes you. Negative => you owe friend.
```

---

*End of document.*

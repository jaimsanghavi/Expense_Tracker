# Personal Daily Expense Tracker (INR)

A private, single-user web app to log daily expenses in INR, classify by payment method and category, manage splits with friends, and view monthly spending dashboards.

## Tech Stack

- **Framework:** Next.js 16 (App Router, React Server Components, Server Actions)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4 + @base-ui/react
- **Database:** Supabase (Postgres + Auth + RLS)
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod
- **Icons:** lucide-react
- **Tests:** Vitest

## Features Completed

- **Authentication** — Email/password login, middleware-protected routes, session cookies via `@supabase/ssr`
- **Dashboard** — Monthly KPI tiles (total spent, to receive, to pay), stacked bar chart by category/payment method, top categories breakdown, month picker
- **Expenses** — Full CRUD, filterable list (month, category, payment method, search), infinite scroll, date grouping
- **Splitting** — Mark expenses as split, assign shares to friends (equal/custom), track pending/paid/gift status
- **Friends** — Friend list with net balances, per-friend ledger with chronological history
- **Categories** — CRUD with icon picker (80+ Lucide icons), color picker (20 presets), archive support
- **Payment Methods** — CRUD with type-specific icons (UPI, Credit Card, Cash, etc.)
- **Profile** — Display name, monthly budget setting
- **Dark Mode** — Default dark theme with oklch color system
- **Data Integrity** — All money as bigint paise, timestamps UTC rendered in IST, RLS on all tables

## Pending / Not Yet Built

- [ ] Receipt image upload (Supabase Storage)
- [ ] Monthly CSV ledger export
- [ ] Recurring expenses
- [ ] Settlement recording flow (friend pays you back)
- [ ] PWA / offline support
- [ ] 2FA / MFA enrolment
- [ ] Budgets per category with overspend alerts
- [ ] Yearly insights and trends
- [ ] Capacitor Android wrapper
- [ ] Receipt OCR
- [ ] Notifications (web push)

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for local Supabase)

### Setup

```bash
# Install dependencies
npm install

# Start local Supabase (requires Docker)
npm run db:start

# Copy env and fill in Supabase credentials
cp .env.local.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:start` | Start local Supabase |
| `npm run db:stop` | Stop local Supabase |
| `npm run db:reset` | Reset DB (rerun migrations + seed) |

## Project Structure

```
app/
  (auth)/login/          # Login page + auth callback
  (app)/                 # Protected routes
    dashboard/           # Monthly dashboard with charts
    expenses/            # Expense list, add/edit
    friends/             # Friends list + per-friend ledger
    settings/
      categories/        # Category management
      payment-methods/   # Payment method management
      profile/           # User profile + budget
components/              # Shared UI components
lib/
  money.ts               # Paise ↔ rupee conversion, INR formatting
  splits.ts              # Split arithmetic (equal, custom)
  dates.ts               # IST date utilities
  schemas.ts             # Zod validation schemas
  supabase/              # Supabase client (server + browser)
supabase/
  migrations/            # Database migrations
  seed.sql               # Default categories + payment methods
tests/                   # Unit tests
```

## Database

Schema managed via Supabase CLI migrations. Key tables:

- `profiles` — User display name, budget
- `categories` — Per-user expense categories with icon/color
- `payment_methods` — UPI, credit card, cash, etc.
- `expenses` — Core expense records (amount in paise)
- `expense_shares` — Split shares per friend
- `friends` — Lightweight contact records
- `settlements` — Settlement records between friends

All tables have Row Level Security enabled — data is invisible to anyone except its owner.

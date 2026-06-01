-- B1: recurring expenses auto-create
-- Link materialized expenses back to their recurring source and enforce one
-- expense per (recurring_id, scheduled period) so cron catch-up is idempotent.

alter table public.expenses
  add column if not exists recurring_id uuid references public.recurring_expenses(id) on delete set null;

create unique index if not exists expenses_recurring_period_uniq
  on public.expenses (recurring_id, spent_at) where recurring_id is not null;

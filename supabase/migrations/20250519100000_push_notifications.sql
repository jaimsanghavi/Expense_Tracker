-- Push notification subscriptions
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- RLS
alter table public.push_subscriptions enable row level security;

create policy "Users manage own subscriptions"
on public.push_subscriptions for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Notification preferences
alter table public.profiles
  add column if not exists notify_large_expense boolean not null default true,
  add column if not exists notify_large_expense_threshold_paise bigint not null default 500000,
  add column if not exists notify_recurring_due boolean not null default true;

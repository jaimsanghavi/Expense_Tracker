-- Initial schema for Expense Tracker
-- All money stored as bigint paise (1 INR = 100 paise)

-- ─── Profiles ───────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  default_currency text not null default 'INR',
  monthly_budget_paise bigint
);

alter table public.profiles enable row level security;
create policy "own rows" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- ─── Categories ─────────────────────────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.categories enable row level security;
create policy "own rows" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Payment Methods ────────────────────────────────────────
create type public.payment_method_type as enum
  ('upi','credit_card','debit_card','cash','net_banking','wallet','other');

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.payment_method_type not null,
  provider text,
  last_four text check (last_four is null or last_four ~ '^[0-9]{4}$'),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.payment_methods enable row level security;
create policy "own rows" on public.payment_methods for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Friends ────────────────────────────────────────────────
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

alter table public.friends enable row level security;
create policy "own rows" on public.friends for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Expenses ───────────────────────────────────────────────
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_paise bigint not null check (amount_paise > 0),
  spent_at timestamptz not null default now(),
  category_id uuid references public.categories(id) on delete set null,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  merchant text,
  note text,
  receipt_path text,
  is_split boolean not null default false,
  paid_by uuid references public.friends(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expenses enable row level security;
create policy "own rows" on public.expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_expenses_user_spent on public.expenses (user_id, spent_at desc);
create index idx_expenses_user_category on public.expenses (user_id, category_id);

-- ─── Expense Shares ─────────────────────────────────────────
create type public.share_status as enum ('pending','paid','gift');

create table public.expense_shares (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references public.friends(id) on delete cascade,
  share_paise bigint not null check (share_paise > 0),
  status public.share_status not null default 'pending',
  settled_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

alter table public.expense_shares enable row level security;
create policy "own rows" on public.expense_shares for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_shares_user_friend on public.expense_shares (user_id, friend_id, status);

-- ─── Settlements ────────────────────────────────────────────
create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references public.friends(id) on delete cascade,
  amount_paise bigint not null check (amount_paise > 0),
  direction text not null check (direction in ('from_friend','to_friend')),
  method public.payment_method_type,
  note text,
  settled_at timestamptz not null default now()
);

alter table public.settlements enable row level security;
create policy "own rows" on public.settlements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_settlements_user_friend on public.settlements (user_id, friend_id, settled_at desc);

-- ─── Recurring Expenses (P1) ────────────────────────────────
create table public.recurring_expenses (
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

alter table public.recurring_expenses enable row level security;
create policy "own rows" on public.recurring_expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Integrity trigger: shares sum <= expense total ─────────
create or replace function public.check_shares_sum() returns trigger as $$
declare total bigint; expense_total bigint;
begin
  select coalesce(sum(share_paise),0) into total
    from public.expense_shares where expense_id = new.expense_id;
  select amount_paise into expense_total from public.expenses where id = new.expense_id;
  if total > expense_total then
    raise exception 'Sum of shares (%) exceeds expense total (%)', total, expense_total;
  end if;
  return new;
end;
$$ language plpgsql;

create constraint trigger trg_shares_sum
  after insert or update on public.expense_shares
  deferrable initially deferred
  for each row execute function public.check_shares_sum();

-- ─── Friend balances view ───────────────────────────────────
create or replace view public.friend_balances as
select
  f.user_id,
  f.id as friend_id,
  f.name,
  coalesce((
    select sum(case when es.status = 'pending' then es.share_paise else 0 end)
    from public.expense_shares es
    join public.expenses e on e.id = es.expense_id
    where es.friend_id = f.id and es.user_id = f.user_id and e.paid_by is null
  ), 0)
  - coalesce((
    select sum(case when es.status = 'pending' then es.share_paise else 0 end)
    from public.expense_shares es
    join public.expenses e on e.id = es.expense_id
    where es.friend_id = f.id and es.user_id = f.user_id and e.paid_by is not null
  ), 0)
  - coalesce((
    select sum(case when s.direction = 'from_friend' then s.amount_paise else -s.amount_paise end)
    from public.settlements s
    where s.friend_id = f.id and s.user_id = f.user_id
  ), 0) as net_owed_to_me_paise
from public.friends f
where f.is_archived = false;

-- ─── Dashboard RPC ──────────────────────────────────────────
create or replace function public.get_month_dashboard(p_month_start date)
returns json
language plpgsql
security definer
as $$
declare
  result json;
  v_user_id uuid := auth.uid();
  v_start timestamptz := p_month_start::timestamptz;
  v_end timestamptz := (p_month_start + interval '1 month')::timestamptz;
begin
  select json_build_object(
    'total_spent_paise', coalesce((
      select sum(e.amount_paise) from public.expenses e
      where e.user_id = v_user_id and e.paid_by is null
        and e.spent_at >= v_start and e.spent_at < v_end
    ), 0),
    'to_receive_paise', coalesce((
      select sum(es.share_paise) from public.expense_shares es
      join public.expenses e on e.id = es.expense_id
      where es.user_id = v_user_id and es.status = 'pending'
        and e.paid_by is null
        and e.spent_at >= v_start and e.spent_at < v_end
    ), 0),
    'to_pay_paise', coalesce((
      select sum(es.share_paise) from public.expense_shares es
      join public.expenses e on e.id = es.expense_id
      where es.user_id = v_user_id and es.status = 'pending'
        and e.paid_by is not null
        and e.spent_at >= v_start and e.spent_at < v_end
    ), 0),
    'total_outstanding_paise', coalesce((
      select sum(es.share_paise) from public.expense_shares es
      join public.expenses e on e.id = es.expense_id
      where es.user_id = v_user_id and es.status = 'pending' and e.paid_by is null
    ), 0),
    'by_category', coalesce((
      select json_agg(row_to_json(t)) from (
        select c.name, c.color, c.icon, sum(e.amount_paise) as total_paise
        from public.expenses e
        left join public.categories c on c.id = e.category_id
        where e.user_id = v_user_id and e.paid_by is null
          and e.spent_at >= v_start and e.spent_at < v_end
        group by c.name, c.color, c.icon
        order by total_paise desc
      ) t
    ), '[]'::json),
    'by_payment_method', coalesce((
      select json_agg(row_to_json(t)) from (
        select pm.name, pm.type, sum(e.amount_paise) as total_paise
        from public.expenses e
        left join public.payment_methods pm on pm.id = e.payment_method_id
        where e.user_id = v_user_id and e.paid_by is null
          and e.spent_at >= v_start and e.spent_at < v_end
        group by pm.name, pm.type
        order by total_paise desc
      ) t
    ), '[]'::json),
    'daily_totals', coalesce((
      select json_agg(row_to_json(t)) from (
        select (e.spent_at at time zone 'Asia/Kolkata')::date as day,
               sum(e.amount_paise) as total_paise
        from public.expenses e
        where e.user_id = v_user_id and e.paid_by is null
          and e.spent_at >= v_start and e.spent_at < v_end
        group by day
        order by day
      ) t
    ), '[]'::json)
  ) into result;

  return result;
end;
$$;

-- ─── Create expense with shares RPC ────────────────────────
create or replace function public.create_expense_with_shares(
  p_amount_paise bigint,
  p_spent_at timestamptz,
  p_category_id uuid,
  p_payment_method_id uuid,
  p_merchant text default null,
  p_note text default null,
  p_paid_by uuid default null,
  p_shares json default '[]'::json
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_expense_id uuid;
  v_share json;
  v_is_split boolean;
begin
  v_is_split := json_array_length(p_shares) > 0;

  insert into public.expenses (user_id, amount_paise, spent_at, category_id, payment_method_id, merchant, note, is_split, paid_by)
  values (v_user_id, p_amount_paise, p_spent_at, p_category_id, p_payment_method_id, p_merchant, p_note, v_is_split, p_paid_by)
  returning id into v_expense_id;

  for v_share in select * from json_array_elements(p_shares)
  loop
    insert into public.expense_shares (expense_id, user_id, friend_id, share_paise)
    values (
      v_expense_id,
      v_user_id,
      (v_share->>'friend_id')::uuid,
      (v_share->>'share_paise')::bigint
    );
  end loop;

  return v_expense_id;
end;
$$;

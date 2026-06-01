-- Fixes the dashboard month window (resolve p_month_start in IST, half-open
-- range) and hardens both SECURITY DEFINER functions: pin search_path and make
-- create_expense_with_shares validate that referenced rows belong to the caller
-- (RLS is bypassed inside a SECURITY DEFINER function).

-- ─── Dashboard RPC: IST-resolved, half-open [start, next-month) window ──────
-- p_month_start is the IST calendar month-start date (e.g. 2026-05-01). It is
-- interpreted in Asia/Kolkata so the window is exactly the IST calendar month,
-- not a UTC-midnight slice that drops the last ~1.5 days of the month.
create or replace function public.get_month_dashboard(p_month_start date)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result json;
  v_user_id uuid := auth.uid();
  v_start timestamptz := (p_month_start::timestamp at time zone 'Asia/Kolkata');
  v_end timestamptz := v_start + interval '1 month';
begin
  select json_build_object(
    'total_spent_paise', coalesce((
      select sum(
        e.amount_paise - coalesce((
          select sum(es.share_paise) from public.expense_shares es where es.expense_id = e.id
        ), 0)
      )
      from public.expenses e
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
        select c.name, c.color, c.icon,
          sum(
            e.amount_paise - coalesce((
              select sum(es.share_paise) from public.expense_shares es where es.expense_id = e.id
            ), 0)
          ) as total_paise
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
        select pm.name, pm.type,
          sum(
            e.amount_paise - coalesce((
              select sum(es.share_paise) from public.expense_shares es where es.expense_id = e.id
            ), 0)
          ) as total_paise
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
          sum(
            e.amount_paise - coalesce((
              select sum(es.share_paise) from public.expense_shares es where es.expense_id = e.id
            ), 0)
          ) as total_paise
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

-- ─── create_expense_with_shares: pin search_path + validate ownership ──────
create or replace function public.create_expense_with_shares(
  p_amount_paise bigint,
  p_spent_at timestamptz,
  p_category_id uuid,
  p_payment_method_id uuid,
  p_merchant text default null,
  p_note text default null,
  p_paid_by uuid default null,
  p_shares text default '[]'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_expense_id uuid;
  v_share json;
  v_is_split boolean;
  v_shares json;
  v_friend_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- RLS is bypassed under SECURITY DEFINER, so verify every referenced row
  -- belongs to the caller before inserting.
  if p_category_id is not null and not exists (
    select 1 from public.categories where id = p_category_id and user_id = v_user_id
  ) then
    raise exception 'Invalid category';
  end if;

  if p_payment_method_id is not null and not exists (
    select 1 from public.payment_methods where id = p_payment_method_id and user_id = v_user_id
  ) then
    raise exception 'Invalid payment method';
  end if;

  if p_paid_by is not null and not exists (
    select 1 from public.friends where id = p_paid_by and user_id = v_user_id
  ) then
    raise exception 'Invalid payer';
  end if;

  v_shares := p_shares::json;
  v_is_split := json_array_length(v_shares) > 0;

  insert into public.expenses (user_id, amount_paise, spent_at, category_id, payment_method_id, merchant, note, is_split, paid_by)
  values (v_user_id, p_amount_paise, p_spent_at, p_category_id, p_payment_method_id, p_merchant, p_note, v_is_split, p_paid_by)
  returning id into v_expense_id;

  for v_share in select * from json_array_elements(v_shares)
  loop
    v_friend_id := (v_share->>'friend_id')::uuid;
    if not exists (
      select 1 from public.friends where id = v_friend_id and user_id = v_user_id
    ) then
      raise exception 'Invalid friend in shares';
    end if;

    insert into public.expense_shares (expense_id, user_id, friend_id, share_paise)
    values (
      v_expense_id,
      v_user_id,
      v_friend_id,
      (v_share->>'share_paise')::bigint
    );
  end loop;

  return v_expense_id;
end;
$$;

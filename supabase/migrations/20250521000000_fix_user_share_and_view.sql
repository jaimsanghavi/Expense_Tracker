-- Fix friend_balances view: remove settlement subtraction (FIFO marks shares as paid)
create or replace view public.friend_balances
with (security_invoker = true)
as
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
  ), 0) as net_owed_to_me_paise
from public.friends f
where f.is_archived = false;

-- Fix get_month_dashboard: use user's share (total - friend shares) instead of full amount
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

-- Insights perf (P5): aggregate the year in Postgres instead of shipping a
-- year of expense rows to the server function and reducing in JS. Mirrors
-- get_month_dashboard: IST-resolved window, user's share (amount - friend
-- shares) for personal expenses (paid_by is null). Inert until the insights
-- page is wired to call it.
--
-- p_year_start is the IST calendar year-start date (e.g. 2026-01-01).
create or replace function public.get_year_insights(p_year_start date)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result json;
  v_user_id uuid := auth.uid();
  v_start timestamptz := (p_year_start::timestamp at time zone 'Asia/Kolkata');
  v_end timestamptz := v_start + interval '1 year';
begin
  select json_build_object(
    -- One row per IST month that has spend; month is 0-indexed (0 = Jan).
    'monthly_totals', coalesce((
      select json_agg(row_to_json(t)) from (
        select
          (extract(month from (e.spent_at at time zone 'Asia/Kolkata'))::int - 1) as month,
          sum(
            e.amount_paise - coalesce((
              select sum(es.share_paise) from public.expense_shares es where es.expense_id = e.id
            ), 0)
          ) as total_paise
        from public.expenses e
        where e.user_id = v_user_id and e.paid_by is null
          and e.spent_at >= v_start and e.spent_at < v_end
        group by month
        order by month
      ) t
    ), '[]'::json),
    'by_category', coalesce((
      select json_agg(row_to_json(t)) from (
        select c.name, c.color, c.icon,
          sum(
            e.amount_paise - coalesce((
              select sum(es.share_paise) from public.expense_shares es where es.expense_id = e.id
            ), 0)
          ) as total_paise
        from public.expenses e
        join public.categories c on c.id = e.category_id
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
        join public.payment_methods pm on pm.id = e.payment_method_id
        where e.user_id = v_user_id and e.paid_by is null
          and e.spent_at >= v_start and e.spent_at < v_end
        group by pm.name, pm.type
        order by total_paise desc
      ) t
    ), '[]'::json)
  ) into result;

  return result;
end;
$$;

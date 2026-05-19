-- Fix friend_balances view to use security_invoker so RLS applies
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
  ), 0)
  - coalesce((
    select sum(case when s.direction = 'from_friend' then s.amount_paise else -s.amount_paise end)
    from public.settlements s
    where s.friend_id = f.id and s.user_id = f.user_id
  ), 0) as net_owed_to_me_paise
from public.friends f
where f.is_archived = false;

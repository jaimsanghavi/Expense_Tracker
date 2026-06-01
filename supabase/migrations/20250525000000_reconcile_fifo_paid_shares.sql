-- Reconcile FIFO-era settlement data for Model B.
--
-- Before Model B, "Settle Up" flipped expense_shares to status='paid' AND
-- inserted a settlements row. Model B's balance (friend_balances view +
-- friendNetBalancePaise) counts only 'pending' shares and separately subtracts
-- settlements — so every pre-switch settlement is now counted twice (the paid
-- share is excluded from "owed" and the settlement is subtracted again),
-- showing a wrong balance for already-settled friends.
--
-- Fix: revert those 'paid' shares to 'pending' so the settlements rows are the
-- single source of truth for what's been paid (the Model B model). 'gift'
-- shares are intentionally left untouched (they are genuinely not owed).
--
-- Note: if any shares were marked 'paid' manually (per-expense "mark as paid")
-- WITHOUT a corresponding settlement, they will reappear as owed — record a
-- settlement or mark them as 'gift' instead. Idempotent: re-running is a no-op.
update public.expense_shares
set status = 'pending', settled_at = null
where status = 'paid';

/**
 * Net balance with a friend, in paise. Positive = the friend owes you;
 * negative = you owe the friend.
 *
 * Model B (signed settlements): pending shares set the gross position and
 * settlements adjust it directly (shares are NOT flipped to 'paid'), so the
 * settlement entries MUST be included here — otherwise the balance ignores
 * settle-ups. This mirrors the `friend_balances` SQL view.
 */
export type BalanceLedgerEntry =
  | {
      type: "expense";
      status: string;
      paid_by: string | null;
      share_paise: number;
    }
  | { type: "settlement"; direction: string; amount_paise: number };

export function friendNetBalancePaise(ledger: BalanceLedgerEntry[]): number {
  return ledger.reduce((acc, entry) => {
    if (entry.type === "expense") {
      if (entry.status !== "pending") return acc;
      // paid_by null = I paid → friend owes me; set = friend paid → I owe.
      return entry.paid_by ? acc - entry.share_paise : acc + entry.share_paise;
    }
    // Settlement: from_friend (they paid me back) reduces what they owe me;
    // to_friend (I paid them back) reduces what I owe.
    return entry.direction === "from_friend"
      ? acc - entry.amount_paise
      : acc + entry.amount_paise;
  }, 0);
}

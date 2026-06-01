import { splitEqual } from "./splits";

/**
 * Distributes itemized receipt amounts across participants.
 *
 * `assignments[i]` is the list of participant ids sharing item `i`; that
 * item's `amountPaise` is split equally among them via `splitEqual`, with the
 * sub-paisa remainder going to the first assignees. Participant id `"me"`
 * represents the user; all other ids are friend ids. Items with no assignees
 * are skipped (their cost falls to nobody).
 *
 * Returns a map of participantId -> total paise across all items (only
 * includes participants that were assigned at least one item).
 */
export function computeItemizedShares(
  items: { amountPaise: number }[],
  assignments: string[][]
): Record<string, number> {
  const totals: Record<string, number> = {};

  items.forEach((item, i) => {
    const assignees = assignments[i] ?? [];
    if (assignees.length === 0) return;

    const shares = splitEqual(item.amountPaise, assignees.length);
    assignees.forEach((participantId, j) => {
      totals[participantId] = (totals[participantId] ?? 0) + shares[j];
    });
  });

  return totals;
}

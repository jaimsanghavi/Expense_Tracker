import { addDays, addWeeks, addMonths, addYears } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import type { Cadence } from "./schemas";

const IST = "Asia/Kolkata";

/**
 * Advance a recurring expense's `next_run_at` by one cadence interval, computed
 * in IST so the run keeps its IST wall-clock time (e.g. "monthly on the 15th at
 * 00:00 IST" stays on the 15th). Returns a UTC ISO string. Runtime-timezone
 * independent — unlike `Date.setMonth`, which uses the host's local zone.
 */
export function computeNextRunUTC(
  currentNextRunISO: string,
  cadence: Cadence
): string {
  const ist = toZonedTime(new Date(currentNextRunISO), IST);
  let next: Date;
  switch (cadence) {
    case "daily":
      next = addDays(ist, 1);
      break;
    case "weekly":
      next = addWeeks(ist, 1);
      break;
    case "monthly":
      next = addMonths(ist, 1);
      break;
    case "yearly":
      next = addYears(ist, 1);
      break;
    default: {
      const _exhaustive: never = cadence;
      throw new Error(`Unknown cadence: ${_exhaustive}`);
    }
  }
  return fromZonedTime(next, IST).toISOString();
}

/**
 * Plan which recurring runs are due as of `nowISO`, walking from `nextRunAtISO`
 * forward one cadence at a time. Every instant `<= now` (up to `cap`) is a
 * period to materialize; the returned `nextRunAt` is the first instant still in
 * the future (the value to persist). Pure and runtime-timezone independent.
 *
 * @returns `runs` — due period instants oldest→newest (length 0 if nothing due);
 *          `nextRunAt` — the new `next_run_at` to store.
 */
export function planRecurringRuns(
  nextRunAtISO: string,
  cadence: Cadence,
  nowISO: string,
  cap = 60
): { runs: string[]; nextRunAt: string } {
  const now = new Date(nowISO).getTime();
  const runs: string[] = [];
  let cursor = nextRunAtISO;
  while (new Date(cursor).getTime() <= now && runs.length < cap) {
    runs.push(cursor);
    cursor = computeNextRunUTC(cursor, cadence);
  }
  return { runs, nextRunAt: cursor };
}

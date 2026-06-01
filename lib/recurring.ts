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

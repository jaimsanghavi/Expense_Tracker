import { startOfMonth, addMonths, format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const IST = "Asia/Kolkata";

/** Get current date/time in IST. */
export function nowIST(): Date {
  return toZonedTime(new Date(), IST);
}

/**
 * Half-open UTC range covering the IST calendar month containing `date`:
 * `[start, end)` where `start` is IST month-start and `end` is the start of
 * the next IST month. Use with `>= start AND < end` to avoid the millisecond
 * gaps and last-day drops of an inclusive end-of-month bound.
 */
export function monthRangeUTC(date: Date = new Date()): {
  start: string;
  end: string;
} {
  const istDate = toZonedTime(date, IST);
  const monthStart = startOfMonth(istDate);
  const nextMonthStart = addMonths(monthStart, 1);
  return {
    start: fromZonedTime(monthStart, IST).toISOString(),
    end: fromZonedTime(nextMonthStart, IST).toISOString(),
  };
}

/**
 * Half-open UTC range covering the IST calendar `year`: `[start, end)` where
 * `start` is Jan 1 of `year` IST and `end` is Jan 1 of the next year IST.
 */
export function yearRangeUTC(year: number): { start: string; end: string } {
  return {
    start: fromZonedTime(new Date(year, 0, 1), IST).toISOString(),
    end: fromZonedTime(new Date(year + 1, 0, 1), IST).toISOString(),
  };
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Format an IST wall-clock date-only string ("YYYY-MM-DD") as "1 May 2026".
 * Parses the components directly so the label never shifts with the browser's
 * timezone (unlike `new Date("YYYY-MM-DD").toLocaleDateString`).
 */
export function formatISTDateLabel(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  return `${day} ${MONTHS_SHORT[month - 1]} ${year}`;
}

/** Format a UTC timestamp to IST date string (e.g. "18 May 2026"). */
export function formatDateIST(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const ist = toZonedTime(d, IST);
  return format(ist, "d MMM yyyy");
}

/** Format a UTC timestamp to IST date + time (e.g. "18 May 2026, 2:30 PM"). */
export function formatDateTimeIST(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const ist = toZonedTime(d, IST);
  return format(ist, "d MMM yyyy, h:mm a");
}

/** Get month label (e.g. "May 2026") from a date. */
export function monthLabel(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const ist = toZonedTime(d, IST);
  return format(ist, "MMMM yyyy");
}

/** Current month in IST as "YYYY-MM". */
export function currentMonthIST(): string {
  const ist = nowIST();
  return format(ist, "yyyy-MM");
}

/** Current year in IST. */
export function currentYearIST(): number {
  return nowIST().getFullYear();
}

/** Today's date in IST as "YYYY-MM-DD". */
export function todayIST(): string {
  return format(nowIST(), "yyyy-MM-dd");
}

/** Current date+time in IST as "YYYY-MM-DDTHH:mm" (for datetime-local inputs). */
export function nowISTLocalString(): string {
  return format(nowIST(), "yyyy-MM-dd'T'HH:mm");
}

/** Get the month index (0-11) of a UTC timestamp in IST. */
export function getMonthIST(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return toZonedTime(d, IST).getMonth();
}

/** Convert a datetime-local string (IST) like "2026-05-23T14:30" to a UTC ISO string. */
export function istLocalToUTC(localStr: string): string {
  return fromZonedTime(new Date(localStr), IST).toISOString();
}

/** Convert a UTC ISO string to IST datetime-local format "YYYY-MM-DDTHH:mm". */
export function utcToISTLocal(utcStr: string): string {
  const ist = toZonedTime(new Date(utcStr), IST);
  return format(ist, "yyyy-MM-dd'T'HH:mm");
}

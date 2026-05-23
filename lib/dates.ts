import { startOfMonth, endOfMonth, format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const IST = "Asia/Kolkata";

/** Get current date/time in IST. */
export function nowIST(): Date {
  return toZonedTime(new Date(), IST);
}

/** Get the start of the month in IST, returned as UTC timestamp. */
export function monthStartUTC(date: Date = new Date()): Date {
  const istDate = toZonedTime(date, IST);
  const monthStart = startOfMonth(istDate);
  return fromZonedTime(monthStart, IST);
}

/** Get the end of the month in IST, returned as UTC timestamp. */
export function monthEndUTC(date: Date = new Date()): Date {
  const istDate = toZonedTime(date, IST);
  const monthEnd = endOfMonth(istDate);
  return fromZonedTime(monthEnd, IST);
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

/** Year boundaries in IST, returned as UTC ISO strings. */
export function yearBoundsUTC(year: number): { start: string; end: string } {
  const start = fromZonedTime(new Date(year, 0, 1), IST);
  const end = fromZonedTime(new Date(year, 11, 31, 23, 59, 59, 999), IST);
  return { start: start.toISOString(), end: end.toISOString() };
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

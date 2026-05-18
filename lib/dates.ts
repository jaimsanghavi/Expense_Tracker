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

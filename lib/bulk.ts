import { istLocalToUTC } from "@/lib/dates";

/** A single editable row in the bulk-expense form. */
export type BulkRow = {
  amount: string;
  date: string; // "YYYY-MM-DD" (IST wall-clock)
  categoryId: string;
  note: string;
};

/** The shape `createExpensesBulk` expects for one expense. */
export type BulkRowPayload = {
  amount: string;
  spent_at: string; // UTC ISO string
  category_id: string | null;
  note: string | null;
};

/** True when a row has no amount typed (treated as empty / skippable). */
export function isBlankBulkRow(row: BulkRow): boolean {
  return !row.amount.trim();
}

/**
 * Convert the form rows into the payload `createExpensesBulk` accepts:
 * drops blank rows, converts each row's IST date to a UTC ISO string, and
 * normalizes empty category/note to null.
 */
export function normalizeBulkRows(rows: BulkRow[]): BulkRowPayload[] {
  return rows
    .filter((row) => !isBlankBulkRow(row))
    .map((row) => ({
      amount: row.amount.trim(),
      spent_at: istLocalToUTC(`${row.date}T00:00`),
      category_id: row.categoryId || null,
      note: row.note.trim() || null,
    }));
}

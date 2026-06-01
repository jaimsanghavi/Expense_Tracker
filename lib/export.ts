import { formatDateIST } from "@/lib/dates";
import { toRupees } from "@/lib/money";

/**
 * A single flattened expense row ready for tabular export (Excel/PDF).
 * Amounts are expressed in rupees (2dp) rather than paise.
 */
export interface ExportRow {
  date: string; // formatDateIST(spent_at), e.g. "18 May 2026"
  merchant: string; // "" if none
  category: string; // category name or ""
  paymentMethod: string; // payment method name or ""
  amount: number; // rupees (toRupees(amount_paise)), 2dp number
  note: string; // "" if none
}

/**
 * Minimal shape of an expense as returned by `getExpenses` — the joined
 * `categories` / `payment_methods` relations may arrive as an object, an
 * array (PostgREST embedding quirk) or null, so we accept all three and
 * normalise defensively (matching the `as` casts used elsewhere).
 */
interface JoinedNamed {
  name?: string | null;
}

export interface ExpenseExportInput {
  amount_paise: number;
  spent_at: string;
  merchant?: string | null;
  note?: string | null;
  categories?: JoinedNamed | JoinedNamed[] | null;
  payment_methods?: JoinedNamed | JoinedNamed[] | null;
}

/** Pull a `.name` from a joined relation that may be an object, array or null. */
function joinedName(rel: JoinedNamed | JoinedNamed[] | null | undefined): string {
  if (!rel) return "";
  const obj = Array.isArray(rel) ? rel[0] : rel;
  return obj?.name ?? "";
}

/**
 * Map expenses (as returned by `getExpenses`) into flat, export-ready rows.
 * Pure and side-effect free so it can be unit-tested directly.
 */
export function expenseExportRows(expenses: ExpenseExportInput[]): ExportRow[] {
  return expenses.map((e) => ({
    date: formatDateIST(e.spent_at),
    merchant: e.merchant ?? "",
    category: joinedName(e.categories),
    paymentMethod: joinedName(e.payment_methods),
    amount: toRupees(e.amount_paise),
    note: e.note ?? "",
  }));
}

/** Column headers shared by the Excel and PDF exports. */
const EXPORT_HEADERS = [
  "Date",
  "Merchant",
  "Category",
  "Payment Method",
  "Amount (₹)",
  "Note",
] as const;

/**
 * Build an `.xlsx` workbook from export rows and trigger a browser download.
 * `xlsx` is dynamically imported so it stays out of the initial bundle.
 */
export async function exportExpensesToExcel(
  rows: ExportRow[],
  filename: string
): Promise<void> {
  const XLSX = await import("xlsx");
  const aoa: (string | number)[][] = [
    [...EXPORT_HEADERS],
    ...rows.map((r) => [
      r.date,
      r.merchant,
      r.category,
      r.paymentMethod,
      r.amount,
      r.note,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Expenses");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Build a PDF from export rows (title + autoTable) and trigger a browser
 * download. `jspdf` and `jspdf-autotable` are dynamically imported so they
 * stay out of the initial bundle.
 */
export async function exportExpensesToPdf(
  rows: ExportRow[],
  filename: string,
  title: string
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();
  doc.text(title, 14, 18);
  autoTable(doc, {
    startY: 24,
    head: [[...EXPORT_HEADERS]],
    body: rows.map((r) => [
      r.date,
      r.merchant,
      r.category,
      r.paymentMethod,
      r.amount.toFixed(2),
      r.note,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save(`${filename}.pdf`);
}

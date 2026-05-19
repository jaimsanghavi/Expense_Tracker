import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";

const IST = "Asia/Kolkata";

function formatDateIST(date: string): string {
  const ist = toZonedTime(new Date(date), IST);
  return format(ist, "d MMM yyyy HH:mm");
}

function escapeCsv(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const month = request.nextUrl.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return new Response("Invalid or missing month parameter. Expected format: YYYY-MM", {
      status: 400,
    });
  }

  const [year, mon] = month.split("-").map(Number);
  if (mon < 1 || mon > 12) {
    return new Response("Invalid month value", { status: 400 });
  }

  // Month range: start of month to start of next month (UTC)
  const start = new Date(Date.UTC(year, mon - 1, 1)).toISOString();
  const end = new Date(Date.UTC(year, mon, 1)).toISOString();

  // Fetch expenses with joined relations
  const { data: expenses, error } = await supabase
    .from("expenses")
    .select(
      `
      id,
      amount_paise,
      spent_at,
      merchant,
      note,
      is_split,
      paid_by,
      categories(name),
      payment_methods(name, type),
      friends!expenses_paid_by_fkey(name)
    `
    )
    .eq("user_id", user.id)
    .gte("spent_at", start)
    .lt("spent_at", end)
    .order("spent_at", { ascending: true });

  if (error) {
    return new Response("Failed to fetch expenses", { status: 500 });
  }

  // Fetch expense shares for all expense IDs
  const expenseIds = (expenses ?? []).map((e) => e.id);
  let sharesMap: Record<string, Array<{ friendName: string; amount: string; status: string }>> = {};

  if (expenseIds.length > 0) {
    const { data: shares } = await supabase
      .from("expense_shares")
      .select(
        `
        expense_id,
        share_paise,
        status,
        friends(name)
      `
      )
      .in("expense_id", expenseIds);

    if (shares) {
      for (const share of shares) {
        const expId = share.expense_id;
        if (!sharesMap[expId]) sharesMap[expId] = [];
        const friendName =
          (share.friends as unknown as { name: string } | null)?.name ?? "Unknown";
        const amount = (share.share_paise / 100).toFixed(2);
        sharesMap[expId].push({
          friendName,
          amount,
          status: share.status,
        });
      }
    }
  }

  // Build CSV
  const headers = ["Date", "Amount (₹)", "Category", "Payment Method", "Merchant", "Note", "Split", "Paid By", "Shares"];
  const rows: string[] = [headers.map(escapeCsv).join(",")];

  for (const expense of expenses ?? []) {
    const date = formatDateIST(expense.spent_at);
    const amount = (expense.amount_paise / 100).toFixed(2);
    const category = (expense.categories as unknown as { name: string } | null)?.name ?? "";
    const pm = (expense.payment_methods as unknown as { name: string; type: string } | null);
    const paymentMethod = pm ? `${pm.name} (${pm.type})` : "";
    const merchant = expense.merchant ?? "";
    const note = expense.note ?? "";
    const isSplit = expense.is_split ? "Yes" : "No";
    const paidBy = expense.paid_by
      ? ((expense.friends as unknown as { name: string } | null)?.name ?? "Friend")
      : "Self";

    const shares = sharesMap[expense.id];
    const sharesStr = shares
      ? shares.map((s) => `${s.friendName}: ₹${s.amount} (${s.status})`).join("; ")
      : "";

    rows.push(
      [date, amount, category, paymentMethod, merchant, note, isSplit, paidBy, sharesStr]
        .map(escapeCsv)
        .join(",")
    );
  }

  const csvContent = "\uFEFF" + rows.join("\r\n");

  return new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="expenses-${month}.csv"`,
    },
  });
}

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { sendPushToUser } from "@/lib/push";
import { formatINR } from "@/lib/money";
import { computeNextRunUTC } from "@/lib/recurring";
import type { Cadence } from "@/lib/schemas";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function GET(request: Request) {
  // Cron auth — require the configured secret; fail closed if it isn't set so
  // a missing CRON_SECRET can't be matched by "Bearer undefined".
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || !authHeader || !safeEqual(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const now = new Date().toISOString();

  // Find recurring expenses where next_run_at is today or earlier
  const { data: recurring } = await supabase
    .from("recurring_expenses")
    .select("id, user_id, amount_paise, note, cadence, next_run_at")
    .eq("is_active", true)
    .lte("next_run_at", now);

  if (!recurring || recurring.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // Get users who have recurring notifications enabled
  const userIds = [...new Set(recurring.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, notify_recurring_due")
    .in("id", userIds)
    .eq("notify_recurring_due", true);

  const notifyUserIds = new Set(profiles?.map((p) => p.id) ?? []);

  let sent = 0;
  for (const expense of recurring) {
    // Advance next_run_at regardless of whether we send a notification
    const nextRun = computeNextRunUTC(
      expense.next_run_at,
      expense.cadence as Cadence
    );
    await supabase
      .from("recurring_expenses")
      .update({ next_run_at: nextRun })
      .eq("id", expense.id);

    if (!notifyUserIds.has(expense.user_id)) continue;

    const amount = formatINR(expense.amount_paise);
    const label = expense.note || "Recurring expense";

    await sendPushToUser(
      expense.user_id,
      {
        title: "Recurring Expense Due",
        body: `${label} — ${amount}`,
        tag: `recurring-${expense.id}`,
        url: "/settings/recurring",
      },
      supabase
    );
    sent++;
  }

  return NextResponse.json({ sent, checked: recurring.length });
}

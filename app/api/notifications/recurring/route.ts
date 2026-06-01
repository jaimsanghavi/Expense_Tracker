import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { sendPushToUser } from "@/lib/push";
import { formatINR } from "@/lib/money";
import { planRecurringRuns } from "@/lib/recurring";
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
    .select(
      "id, user_id, amount_paise, note, cadence, next_run_at, category_id, payment_method_id"
    )
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
    // Plan every missed period (capped catch-up) and the new next_run_at.
    const { runs, nextRunAt } = planRecurringRuns(
      expense.next_run_at,
      expense.cadence as Cadence,
      now
    );

    // Materialize one personal expense per due period. The unique index on
    // (recurring_id, spent_at) plus ignoreDuplicates makes this idempotent, so
    // a retried or overlapping cron run won't double-insert.
    if (runs.length > 0) {
      await supabase.from("expenses").upsert(
        runs.map((run) => ({
          user_id: expense.user_id,
          amount_paise: expense.amount_paise,
          spent_at: run,
          category_id: expense.category_id,
          payment_method_id: expense.payment_method_id,
          note: expense.note,
          is_split: false,
          paid_by: null,
          recurring_id: expense.id,
        })),
        { onConflict: "recurring_id,spent_at", ignoreDuplicates: true }
      );
    }

    // Advance next_run_at regardless of whether we send a notification.
    await supabase
      .from("recurring_expenses")
      .update({ next_run_at: nextRunAt })
      .eq("id", expense.id);

    if (runs.length === 0) continue;
    if (!notifyUserIds.has(expense.user_id)) continue;

    const amount = formatINR(expense.amount_paise);
    const label = expense.note || "Recurring expense";

    await sendPushToUser(
      expense.user_id,
      {
        title: "Recurring expense added",
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

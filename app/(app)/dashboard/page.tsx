import { Suspense } from "react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { currentMonthIST } from "@/lib/dates";
import { DashboardView } from "./dashboard-view";
import { DashboardSkeleton } from "./dashboard-skeleton";

interface DashboardData {
  total_spent_paise: number;
  to_receive_paise: number;
  to_pay_paise: number;
  total_outstanding_paise: number;
  by_category: Array<{ name: string; color: string; icon: string; total_paise: number }>;
  by_payment_method: Array<{ name: string; type: string; total_paise: number }>;
  daily_totals: Array<{ day: string; total_paise: number }>;
}

interface RecentExpense {
  id: string;
  amount_paise: number;
  note: string | null;
  merchant: string | null;
  spent_at: string;
  is_split: boolean;
  paid_by: string | null;
  category: { name: string; color: string; icon: string } | null;
  expense_shares: { share_paise: number }[];
}

interface FriendBalance {
  friend_id: string;
  name: string;
  net_owed_to_me_paise: number;
}

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardContent({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const monthParam = params.month;

  // IST calendar month ("YYYY-MM"); the RPC resolves the IST window from it.
  const monthValue =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? monthParam
      : currentMonthIST();

  const supabase = await createClient();
  const user = await getCurrentUser();

  const [dashboardRes, expensesRes, friendsRes, profileRes] = await Promise.all([
    supabase.rpc("get_month_dashboard", {
      p_month_start: `${monthValue}-01`,
    }),
    supabase
      .from("expenses")
      .select("id, amount_paise, note, merchant, spent_at, is_split, paid_by, category:categories(name, color, icon), expense_shares(share_paise)")
      .order("spent_at", { ascending: false })
      .limit(5),
    supabase
      .from("friend_balances")
      .select("friend_id, name, net_owed_to_me_paise")
      .eq("user_id", user!.id)
      .order("net_owed_to_me_paise", { ascending: false }),
    supabase
      .from("profiles")
      .select("monthly_budget_paise")
      .eq("id", user!.id)
      .single(),
  ]);

  const rpc = dashboardRes.data as DashboardData | null;
  const allBalances: FriendBalance[] =
    (friendsRes.data as FriendBalance[] | null) ?? [];

  // Model B: receivable/payable are the net of friend_balances (which already
  // accounts for settlements), not month-scoped pending shares — so they stay
  // correct after partial settle-ups.
  const toReceivePaise = allBalances.reduce(
    (sum, f) => sum + Math.max(f.net_owed_to_me_paise, 0),
    0
  );
  const toPayPaise = allBalances.reduce(
    (sum, f) => sum + Math.max(-f.net_owed_to_me_paise, 0),
    0
  );

  const dashboard: DashboardData = {
    total_spent_paise: rpc?.total_spent_paise ?? 0,
    to_receive_paise: toReceivePaise,
    to_pay_paise: toPayPaise,
    total_outstanding_paise: toReceivePaise,
    by_category: rpc?.by_category ?? [],
    by_payment_method: rpc?.by_payment_method ?? [],
    daily_totals: rpc?.daily_totals ?? [],
  };

  const recentExpenses: RecentExpense[] = (expensesRes.data as RecentExpense[] | null) ?? [];
  const friendBalances: FriendBalance[] = allBalances.slice(0, 3);

  return (
    <DashboardView
      dashboard={dashboard}
      recentExpenses={recentExpenses}
      friendBalances={friendBalances}
      currentMonth={monthValue}
      monthlyBudgetPaise={profileRes.data?.monthly_budget_paise ?? null}
    />
  );
}

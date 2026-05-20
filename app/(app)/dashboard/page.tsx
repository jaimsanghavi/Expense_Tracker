import { createClient } from "@/lib/supabase/server";
import { monthStartUTC } from "@/lib/dates";
import { DashboardView } from "./dashboard-view";

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const monthParam = params.month;

  const monthDate = monthParam ? new Date(monthParam + "-01") : new Date();
  const monthStart = monthStartUTC(monthDate);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [dashboardRes, expensesRes, friendsRes, profileRes] = await Promise.all([
    supabase.rpc("get_month_dashboard", {
      p_month_start: monthStart.toISOString().slice(0, 10),
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
      .order("net_owed_to_me_paise", { ascending: false })
      .limit(3),
    supabase
      .from("profiles")
      .select("monthly_budget_paise")
      .eq("id", user!.id)
      .single(),
  ]);

  const dashboard: DashboardData = dashboardRes.data ?? {
    total_spent_paise: 0,
    to_receive_paise: 0,
    to_pay_paise: 0,
    total_outstanding_paise: 0,
    by_category: [],
    by_payment_method: [],
    daily_totals: [],
  };

  const recentExpenses: RecentExpense[] = (expensesRes.data as RecentExpense[] | null) ?? [];
  const friendBalances: FriendBalance[] = (friendsRes.data as FriendBalance[] | null) ?? [];

  // Use the original param for display (not UTC-converted monthStart which can shift months)
  const monthValue = monthParam ?? new Date().toISOString().slice(0, 7);

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

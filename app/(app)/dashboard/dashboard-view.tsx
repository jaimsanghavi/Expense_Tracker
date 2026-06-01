"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  IndianRupee,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Receipt,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatINR, toRupees } from "@/lib/money";
import { formatDateIST } from "@/lib/dates";
import { CategoryIcon } from "@/components/category-icon";
import { MonthPicker } from "@/components/month-picker";

// Charts pull in the heavy recharts library — load it lazily so it doesn't ship
// in the dashboard's initial bundle; the cards/numbers paint first.
const SpendChart = dynamic(() => import("./spend-chart"), {
  ssr: false,
  loading: () => (
    <div className="h-[260px] w-full animate-pulse rounded-lg bg-muted/50" />
  ),
});

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

interface DashboardViewProps {
  dashboard: DashboardData;
  recentExpenses: RecentExpense[];
  friendBalances: FriendBalance[];
  currentMonth: string;
  monthlyBudgetPaise: number | null;
}

const PM_COLORS: Record<string, string> = {
  upi: "#8b5cf6",
  credit_card: "#f59e0b",
  debit_card: "#06b6d4",
  cash: "#10b981",
  bank_transfer: "#3b82f6",
  other: "#6b7280",
};

export function DashboardView({
  dashboard,
  recentExpenses,
  friendBalances,
  currentMonth,
  monthlyBudgetPaise,
}: DashboardViewProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleMonthChange = (value: string) => {
    if (value) {
      router.push(`${pathname}?month=${value}`);
    }
  };

  function userSharePaise(expense: RecentExpense): number {
    if (!expense.is_split || !expense.expense_shares?.length) return expense.amount_paise;
    if (!expense.paid_by) {
      const friendsTotal = expense.expense_shares.reduce((s, sh) => s + sh.share_paise, 0);
      return expense.amount_paise - friendsTotal;
    }
    return expense.amount_paise;
  }

  const topCategory = dashboard.by_category.length > 0
    ? dashboard.by_category.reduce((a, b) => (a.total_paise > b.total_paise ? a : b))
    : null;

  const totalCategoryPaise = dashboard.by_category.reduce((sum, c) => sum + c.total_paise, 0);
  const totalPMPaise = dashboard.by_payment_method.reduce((sum, p) => sum + p.total_paise, 0);

  const chartData = dashboard.daily_totals.map((d) => ({
    day: new Date(d.day).getDate().toString(),
    amount: toRupees(d.total_paise),
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your financial overview</p>
        </div>
        <MonthPicker
          value={currentMonth}
          onChange={handleMonthChange}
        />
      </div>

      {/* Primary KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Spent this month
            </CardTitle>
            <div className="rounded-full bg-primary/10 p-2">
              <IndianRupee className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-2xl font-bold tabular-nums">{formatINR(dashboard.total_spent_paise)}</p>
            {monthlyBudgetPaise != null && monthlyBudgetPaise > 0 && (() => {
              const pct = (dashboard.total_spent_paise / monthlyBudgetPaise) * 100;
              const barWidth = Math.min(pct, 100);
              const barColor =
                pct > 100
                  ? "oklch(0.63 0.25 29)"
                  : pct >= 75
                    ? "oklch(0.80 0.18 84)"
                    : "oklch(0.72 0.19 142)";
              const overBy = dashboard.total_spent_paise - monthlyBudgetPaise;
              return (
                <div className="mt-3 space-y-1.5">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${barWidth}%`, backgroundColor: barColor }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatINR(dashboard.total_spent_paise)} of {formatINR(monthlyBudgetPaise)} budget
                  </p>
                  {overBy > 0 && (
                    <p className="text-xs font-medium" style={{ color: "oklch(0.63 0.25 29)" }}>
                      Over budget by {formatINR(overBy)}
                    </p>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              To Receive
            </CardTitle>
            <div className="rounded-full bg-emerald-500/10 p-2">
              <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-2xl font-bold tabular-nums text-emerald-500">
              {formatINR(dashboard.to_receive_paise)}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              To Pay
            </CardTitle>
            <div className="rounded-full bg-red-500/10 p-2">
              <ArrowUpRight className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-2xl font-bold tabular-nums text-red-500">
              {formatINR(dashboard.to_pay_paise)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outstanding</p>
            <p className="text-lg font-semibold mt-1 tabular-nums">
              {formatINR(dashboard.total_outstanding_paise)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">all-time balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Top Category</p>
            {topCategory ? (
              <div className="flex items-center gap-2 mt-1">
                <CategoryIcon icon={topCategory.icon} color={topCategory.color} size="sm" />
                <span className="text-lg font-semibold">{topCategory.name}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">No data</p>
            )}
            {topCategory && (
              <p className="text-xs text-muted-foreground mt-0.5">{formatINR(topCategory.total_paise)}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Days</p>
            <p className="text-lg font-semibold mt-1 tabular-nums">{dashboard.daily_totals.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Spend Analyzer Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Daily Spending
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 && dashboard.total_spent_paise > 0 ? (
            <SpendChart data={chartData} />
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <TrendingUp className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No spending recorded this month</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown + Payment Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dashboard.by_category.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.by_category
                .sort((a, b) => b.total_paise - a.total_paise)
                .slice(0, 6)
                .map((cat) => {
                  const pct = totalCategoryPaise > 0
                    ? (cat.total_paise / totalCategoryPaise) * 100
                    : 0;
                  return (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />
                          <span className="font-medium">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                          <span className="tabular-nums text-muted-foreground">{formatINR(cat.total_paise)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${pct}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        )}

        {dashboard.by_payment_method.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment Methods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-3 w-full rounded-full overflow-hidden flex">
                {dashboard.by_payment_method.map((pm) => {
                  const pct = totalPMPaise > 0 ? (pm.total_paise / totalPMPaise) * 100 : 0;
                  return (
                    <div
                      key={pm.name}
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: PM_COLORS[pm.type] ?? PM_COLORS.other,
                      }}
                      title={`${pm.name}: ${formatINR(pm.total_paise)}`}
                    />
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {dashboard.by_payment_method.map((pm) => {
                  const pct = totalPMPaise > 0 ? (pm.total_paise / totalPMPaise) * 100 : 0;
                  return (
                    <div key={pm.name} className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-2 text-xs">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: PM_COLORS[pm.type] ?? PM_COLORS.other }}
                      />
                      <span className="truncate font-medium">{pm.name}</span>
                      <span className="text-muted-foreground ml-auto tabular-nums">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Grid: Recent Activity + Friend Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
            <Link
              href="/expenses"
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {recentExpenses.length > 0 ? (
              <div className="space-y-1">
                {recentExpenses.map((expense) => (
                  <Link
                    key={expense.id}
                    href={`/expenses/${expense.id}`}
                    className="flex items-center justify-between rounded-lg px-2 py-2.5 -mx-2 transition-colors hover:bg-muted/50 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CategoryIcon
                        icon={expense.category?.icon}
                        color={expense.category?.color}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <span className="text-sm font-medium truncate block group-hover:text-primary transition-colors">
                          {expense.merchant || expense.note || "Expense"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateIST(expense.spent_at)}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums shrink-0 ml-2">
                      {formatINR(userSharePaise(expense))}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Receipt className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No expenses yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Friend Balances
            </CardTitle>
            <Link
              href="/friends"
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {friendBalances.length > 0 ? (
              <div className="space-y-1">
                {friendBalances.map((friend) => (
                  <Link
                    key={friend.friend_id}
                    href={`/friends/${friend.friend_id}`}
                    className="flex items-center justify-between rounded-lg px-2 py-2.5 -mx-2 transition-colors hover:bg-muted/50 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {friend.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium group-hover:text-primary transition-colors">
                        {friend.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          friend.net_owed_to_me_paise > 0
                            ? "text-emerald-500"
                            : friend.net_owed_to_me_paise < 0
                              ? "text-red-400"
                              : "text-muted-foreground"
                        }`}
                      >
                        {friend.net_owed_to_me_paise > 0 && "+"}
                        {formatINR(Math.abs(friend.net_owed_to_me_paise))}
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        {friend.net_owed_to_me_paise > 0
                          ? "owes you"
                          : friend.net_owed_to_me_paise < 0
                            ? "you owe"
                            : "settled"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No friends added yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

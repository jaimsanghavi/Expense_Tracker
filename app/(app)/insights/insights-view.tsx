"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  IndianRupee,
  TrendingUp,
  CalendarDays,
  LayoutGrid,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR, toRupees } from "@/lib/money";
import { nowIST } from "@/lib/dates";
import { CategoryIcon } from "@/components/category-icon";
import type { InsightsData } from "./page";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const PM_COLORS: Record<string, string> = {
  upi: "#8b5cf6",
  credit_card: "#f59e0b",
  debit_card: "#06b6d4",
  cash: "#10b981",
  bank_transfer: "#3b82f6",
  other: "#6b7280",
};

// Lazy-load the recharts chart so it stays out of the initial insights bundle.
const MonthlyChart = dynamic(() => import("./monthly-chart"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full animate-pulse rounded-lg bg-muted/50" />
  ),
});

interface InsightsViewProps {
  data: InsightsData;
}

export function InsightsView({ data }: InsightsViewProps) {
  const router = useRouter();
  const currentYear = nowIST().getFullYear();
  const years = Array.from({ length: currentYear - 2024 + 1 }, (_, i) => 2024 + i);

  const handleYearChange = (value: string) => {
    router.push(`/insights?year=${value}`);
  };

  const chartData = data.monthly_totals.map((m) => ({
    month: MONTHS[m.month],
    amount: toRupees(m.total_paise),
  }));

  const totalCategoryPaise = data.by_category.reduce((s, c) => s + c.total_paise, 0);
  const totalPMPaise = data.by_payment_method.reduce((s, p) => s + p.total_paise, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Yearly Insights</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Full-year spending analytics
          </p>
        </div>
        <Select value={String(data.year)} onValueChange={(v) => v && handleYearChange(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Yearly Spend
            </CardTitle>
            <div className="rounded-full bg-primary/10 p-2">
              <IndianRupee className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-2xl font-bold tabular-nums">
              {formatINR(data.total_paise)}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Monthly
            </CardTitle>
            <div className="rounded-full bg-blue-500/10 p-2">
              <CalendarDays className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-2xl font-bold tabular-nums">
              {formatINR(data.avg_monthly_paise)}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Highest Month
            </CardTitle>
            <div className="rounded-full bg-red-500/10 p-2">
              <TrendingUp className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {data.highest_month ? (
              <>
                <p className="text-2xl font-bold tabular-nums">
                  {formatINR(data.highest_month.total_paise)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {MONTHS[data.highest_month.month]}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categories Used
            </CardTitle>
            <div className="rounded-full bg-emerald-500/10 p-2">
              <LayoutGrid className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-2xl font-bold tabular-nums">
              {data.categories_used}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Monthly Spending
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.total_paise > 0 ? (
            <MonthlyChart data={chartData} />
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <TrendingUp className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No spending recorded this year</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category + Payment Method Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {data.by_category.length > 0 ? (
              <div className="space-y-3">
                {data.by_category.slice(0, 10).map((cat) => {
                  const pct =
                    totalCategoryPaise > 0
                      ? (cat.total_paise / totalCategoryPaise) * 100
                      : 0;
                  return (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <CategoryIcon
                            icon={cat.icon}
                            color={cat.color}
                            size="sm"
                          />
                          <span className="font-medium">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {pct.toFixed(0)}%
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {formatINR(cat.total_paise)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <LayoutGrid className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Method Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            {data.by_payment_method.length > 0 ? (
              <div className="space-y-3">
                {data.by_payment_method.map((pm) => {
                  const pct =
                    totalPMPaise > 0
                      ? (pm.total_paise / totalPMPaise) * 100
                      : 0;
                  const color = PM_COLORS[pm.type] ?? PM_COLORS.other;
                  return (
                    <div key={pm.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-medium">{pm.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {pct.toFixed(0)}%
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {formatINR(pm.total_paise)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <IndianRupee className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Month-over-Month Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-primary" />
            Month-over-Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.total_paise > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.month_trends.map((m) => (
                  <TableRow key={m.month}>
                    <TableCell className="font-medium">
                      {MONTHS[m.month]}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {m.total_paise > 0 ? formatINR(m.total_paise) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {m.change_pct !== null ? (
                        <span
                          className={`inline-flex items-center gap-1 text-sm tabular-nums ${
                            m.change_pct > 0
                              ? "text-red-500"
                              : m.change_pct < 0
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }`}
                        >
                          {m.change_pct > 0 ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : m.change_pct < 0 ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                          {Math.abs(m.change_pct).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <CalendarDays className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No data</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

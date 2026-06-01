import { Suspense } from "react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { currentYearIST } from "@/lib/dates";
import { InsightsView } from "./insights-view";
import { InsightsSkeleton } from "./insights-skeleton";

interface CategoryTotal {
  name: string;
  color: string;
  icon: string;
  total_paise: number;
}

interface PaymentMethodTotal {
  name: string;
  type: string;
  total_paise: number;
}

interface MonthlyTotal {
  month: number; // 0-11
  total_paise: number;
}

interface MonthTrend {
  month: number;
  total_paise: number;
  change_pct: number | null; // null for first month
}

export interface InsightsData {
  year: number;
  total_paise: number;
  avg_monthly_paise: number;
  highest_month: { month: number; total_paise: number } | null;
  lowest_month: { month: number; total_paise: number } | null;
  categories_used: number;
  monthly_totals: MonthlyTotal[];
  by_category: CategoryTotal[];
  by_payment_method: PaymentMethodTotal[];
  month_trends: MonthTrend[];
}

export default function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  return (
    <Suspense fallback={<InsightsSkeleton />}>
      <InsightsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function InsightsContent({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const currentYear = currentYearIST();
  const year = params.year ? parseInt(params.year, 10) : currentYear;

  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }

  type YearInsights = {
    monthly_totals: { month: number; total_paise: number }[];
    by_category: CategoryTotal[];
    by_payment_method: PaymentMethodTotal[];
  };

  const { data: rpcData } = await supabase.rpc("get_year_insights", {
    p_year_start: `${year}-01-01`,
  });
  const agg = (rpcData as YearInsights | null) ?? {
    monthly_totals: [],
    by_category: [],
    by_payment_method: [],
  };

  // Expand the sparse per-month rows into a fixed 0-11 array.
  const monthBuckets = Array.from({ length: 12 }, () => 0);
  for (const m of agg.monthly_totals) {
    if (m.month >= 0 && m.month < 12) monthBuckets[m.month] = m.total_paise;
  }

  const monthly_totals: MonthlyTotal[] = monthBuckets.map((total, i) => ({
    month: i,
    total_paise: total,
  }));

  const total_paise = monthBuckets.reduce((a, b) => a + b, 0);
  const nonZeroMonths = monthly_totals.filter((m) => m.total_paise > 0);
  const avg_monthly_paise =
    nonZeroMonths.length > 0
      ? Math.round(total_paise / nonZeroMonths.length)
      : 0;

  const highest_month =
    nonZeroMonths.length > 0
      ? nonZeroMonths.reduce((a, b) => (a.total_paise >= b.total_paise ? a : b))
      : null;

  const lowest_month =
    nonZeroMonths.length > 0
      ? nonZeroMonths.reduce((a, b) => (a.total_paise <= b.total_paise ? a : b))
      : null;

  const month_trends: MonthTrend[] = monthly_totals.map((m, i) => {
    if (i === 0 || monthly_totals[i - 1].total_paise === 0) {
      return { month: m.month, total_paise: m.total_paise, change_pct: null };
    }
    const prev = monthly_totals[i - 1].total_paise;
    const change_pct = ((m.total_paise - prev) / prev) * 100;
    return { month: m.month, total_paise: m.total_paise, change_pct };
  });

  const data: InsightsData = {
    year,
    total_paise,
    avg_monthly_paise,
    highest_month: highest_month
      ? { month: highest_month.month, total_paise: highest_month.total_paise }
      : null,
    lowest_month: lowest_month
      ? { month: lowest_month.month, total_paise: lowest_month.total_paise }
      : null,
    categories_used: agg.by_category.length,
    monthly_totals,
    by_category: agg.by_category,
    by_payment_method: agg.by_payment_method,
    month_trends,
  };

  return <InsightsView data={data} />;
}

import { createClient } from "@/lib/supabase/server";
import { InsightsView } from "./insights-view";

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

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = params.year ? parseInt(params.year, 10) : currentYear;

  const yearStart = `${year}-01-01T00:00:00.000Z`;
  const yearEnd = `${year}-12-31T23:59:59.999Z`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }

  const { data: expenses } = await supabase
    .from("expenses")
    .select(
      "amount_paise, spent_at, category:categories(name, color, icon), payment_method:payment_methods(name, type)"
    )
    .gte("spent_at", yearStart)
    .lte("spent_at", yearEnd)
    .is("paid_by", null)
    .order("spent_at", { ascending: true });

  const rows = (expenses ?? []).map((e) => ({
    amount_paise: e.amount_paise,
    spent_at: e.spent_at,
    category: e.category as unknown as { name: string; color: string; icon: string } | null,
    payment_method: e.payment_method as unknown as { name: string; type: string } | null,
  }));

  // Monthly totals (0-11)
  const monthBuckets = Array.from({ length: 12 }, () => 0);
  const categoryMap = new Map<string, CategoryTotal>();
  const pmMap = new Map<string, PaymentMethodTotal>();

  for (const row of rows) {
    const monthIdx = new Date(row.spent_at).getMonth();
    monthBuckets[monthIdx] += row.amount_paise;

    if (row.category) {
      const key = row.category.name;
      const existing = categoryMap.get(key);
      if (existing) {
        existing.total_paise += row.amount_paise;
      } else {
        categoryMap.set(key, { ...row.category, total_paise: row.amount_paise });
      }
    }

    if (row.payment_method) {
      const key = row.payment_method.name;
      const existing = pmMap.get(key);
      if (existing) {
        existing.total_paise += row.amount_paise;
      } else {
        pmMap.set(key, { ...row.payment_method, total_paise: row.amount_paise });
      }
    }
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
      ? nonZeroMonths.reduce((a, b) =>
          a.total_paise >= b.total_paise ? a : b
        )
      : null;

  const lowest_month =
    nonZeroMonths.length > 0
      ? nonZeroMonths.reduce((a, b) =>
          a.total_paise <= b.total_paise ? a : b
        )
      : null;

  const month_trends: MonthTrend[] = monthly_totals.map((m, i) => {
    if (i === 0 || monthly_totals[i - 1].total_paise === 0) {
      return { month: m.month, total_paise: m.total_paise, change_pct: null };
    }
    const prev = monthly_totals[i - 1].total_paise;
    const change_pct = ((m.total_paise - prev) / prev) * 100;
    return { month: m.month, total_paise: m.total_paise, change_pct };
  });

  const by_category = Array.from(categoryMap.values()).sort(
    (a, b) => b.total_paise - a.total_paise
  );

  const by_payment_method = Array.from(pmMap.values()).sort(
    (a, b) => b.total_paise - a.total_paise
  );

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
    categories_used: categoryMap.size,
    monthly_totals,
    by_category,
    by_payment_method,
    month_trends,
  };

  return <InsightsView data={data} />;
}

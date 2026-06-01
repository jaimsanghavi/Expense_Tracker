"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const TOOLTIP_STYLE = {
  backgroundColor: "oklch(0.20 0.02 260)",
  border: "1px solid oklch(0.30 0.02 260)",
  borderRadius: "8px",
  color: "oklch(0.95 0 0)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
};

/**
 * Monthly-spend bar chart, code-split via next/dynamic so recharts stays out of
 * the insights page's initial bundle.
 */
export default function MonthlyChart({
  data,
}: {
  data: { month: string; amount: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "oklch(0.65 0.03 260)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "oklch(0.65 0.03 260)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `₹${v.toLocaleString("en-IN")}`}
          width={65}
        />
        <Tooltip
          formatter={(value) => [
            `₹${Number(value).toLocaleString("en-IN")}`,
            "Spent",
          ]}
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: "oklch(0.25 0.02 260)", opacity: 0.3 }}
        />
        <Bar dataKey="amount" radius={[6, 6, 0, 0]} fill="oklch(0.60 0.18 260)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Receipt, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon } from "@/components/category-icon";
import { MonthPicker } from "@/components/month-picker";
import { formatINR } from "@/lib/money";
import { formatDateIST } from "@/lib/dates";
import { getExpenses } from "./actions";

type Expense = {
  id: string;
  amount_paise: number;
  spent_at: string;
  merchant: string | null;
  note: string | null;
  is_split: boolean;
  categories: { id: string; name: string; color: string | null; icon: string | null } | null;
  payment_methods: { id: string; name: string; type: string } | null;
};

type Category = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
};

type PaymentMethod = {
  id: string;
  name: string;
  type: string;
};

interface ExpenseListProps {
  initialExpenses: Expense[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  filters: {
    month?: string;
    categoryId?: string;
    paymentMethodId?: string;
    search?: string;
  };
}

export function ExpenseList({
  initialExpenses,
  categories,
  paymentMethods,
  filters,
}: ExpenseListProps) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [offset, setOffset] = useState(initialExpenses.length);
  const [hasMore, setHasMore] = useState(initialExpenses.length === 50);
  const [isPending, startTransition] = useTransition();

  // Sync local state when server data changes (after filter navigation)
  useEffect(() => {
    setExpenses(initialExpenses);
    setOffset(initialExpenses.length);
    setHasMore(initialExpenses.length === 50);
  }, [initialExpenses]);

  const [month, setMonth] = useState(filters.month ?? "");
  const [categoryId, setCategoryId] = useState(filters.categoryId || "all");
  const [paymentMethodId, setPaymentMethodId] = useState(
    filters.paymentMethodId || "all"
  );
  const [search, setSearch] = useState(filters.search ?? "");

  function applyFilters(overrides?: Record<string, string>) {
    const params = new URLSearchParams();
    const values = {
      month,
      categoryId: categoryId === "all" ? "" : categoryId,
      paymentMethodId: paymentMethodId === "all" ? "" : paymentMethodId,
      search,
      ...overrides,
    };
    Object.entries(values).forEach(([key, val]) => {
      if (val && val !== "all") params.set(key, val);
    });
    router.push(`/expenses?${params.toString()}`);
  }

  function loadMore() {
    startTransition(async () => {
      const more = await getExpenses({
        month: filters.month,
        categoryId: filters.categoryId,
        paymentMethodId: filters.paymentMethodId,
        search: filters.search,
        offset,
      });
      setExpenses((prev) => [...prev, ...more]);
      setOffset((prev) => prev + more.length);
      setHasMore(more.length === 50);
    });
  }

  // Group expenses by date
  const grouped = expenses.reduce<Record<string, Expense[]>>((acc, expense) => {
    const dateKey = formatDateIST(expense.spent_at);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(expense);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your daily spending</p>
        </div>
        <Link href="/expenses/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
        <MonthPicker
          value={month}
          onChange={(val) => {
            setMonth(val);
            applyFilters({ month: val });
          }}
          className="w-44"
        />
        <Select
          value={categoryId}
          onValueChange={(val) => {
            const v = val ?? "all";
            setCategoryId(v);
            applyFilters({ categoryId: v === "all" ? "" : v });
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category">
              {(value: string | null) => {
                if (!value || value === "all") return "All Categories";
                return categories.find((c) => c.id === value)?.name ?? "Category";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={paymentMethodId}
          onValueChange={(val) => {
            const v = val ?? "all";
            setPaymentMethodId(v);
            applyFilters({ paymentMethodId: v === "all" ? "" : v });
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Payment Method">
              {(value: string | null) => {
                if (!value || value === "all") return "All Methods";
                return paymentMethods.find((pm) => pm.id === value)?.name ?? "Payment Method";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            {paymentMethods.map((pm) => (
              <SelectItem key={pm.id} value={pm.id}>
                {pm.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search merchant, note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters({ search });
            }}
            className="pl-8"
          />
        </div>
      </div>

      {/* Expense list grouped by date */}
      {Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Receipt className="h-8 w-8 opacity-50" />
          </div>
          <p className="font-medium">No expenses found</p>
          <p className="text-sm mt-1">Try adjusting your filters or add a new expense</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {date}
                </h3>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatINR(items.reduce((sum, e) => sum + e.amount_paise, 0))}
                </span>
              </div>
              <div className="space-y-1.5">
                {items.map((expense) => (
                  <Link
                    key={expense.id}
                    href={`/expenses/${expense.id}`}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-all duration-200 hover:bg-muted/50 hover:border-primary/20 group"
                  >
                    {/* Category icon */}
                    <CategoryIcon
                      icon={expense.categories?.icon}
                      color={expense.categories?.color}
                      size="md"
                    />
                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">
                        {expense.merchant || expense.note || "Expense"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {expense.categories && (
                          <span>{expense.categories.name}</span>
                        )}
                        {expense.payment_methods && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {expense.payment_methods.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {/* Split indicator */}
                    {expense.is_split && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        <Users className="mr-1 h-3 w-3" />
                        Split
                      </Badge>
                    )}
                    {/* Amount */}
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatINR(expense.amount_paise)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={loadMore} disabled={isPending}>
            {isPending ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}

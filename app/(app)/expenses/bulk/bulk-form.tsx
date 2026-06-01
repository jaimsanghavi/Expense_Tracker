"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IndianRupee, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryIcon } from "@/components/category-icon";
import { todayIST } from "@/lib/dates";
import { normalizeBulkRows, isBlankBulkRow, type BulkRow } from "@/lib/bulk";
import { createExpensesBulk } from "../actions";

type Category = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
};

interface BulkExpenseFormProps {
  categories: Category[];
}

function emptyRow(): BulkRow {
  return { amount: "", date: todayIST(), categoryId: "", note: "" };
}

export function BulkExpenseForm({ categories }: BulkExpenseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<BulkRow[]>(() => [
    emptyRow(),
    emptyRow(),
    emptyRow(),
  ]);

  function updateRow(index: number, patch: Partial<BulkRow>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) =>
      prev.length === 1 ? [emptyRow()] : prev.filter((_, i) => i !== index)
    );
  }

  function handleSave() {
    const payload = normalizeBulkRows(rows);
    if (payload.length === 0) {
      toast.error("Add at least one expense with an amount.");
      return;
    }

    startTransition(async () => {
      const result = await createExpensesBulk(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Added ${result.count} expenses`);
      router.push("/expenses");
    });
  }

  const filledCount = rows.filter((r) => !isBlankBulkRow(r)).length;

  return (
    <div className="space-y-4">
      {/* Column headers (desktop) */}
      <div className="hidden gap-3 px-1 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[1fr_1fr_1fr_1.5fr_auto]">
        <span>Amount</span>
        <span>Category</span>
        <span>Date</span>
        <span>Note</span>
        <span className="w-9" />
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-3 sm:grid-cols-[1fr_1fr_1fr_1.5fr_auto] sm:items-center sm:border-0 sm:bg-transparent sm:p-0"
          >
            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="sm:hidden">Amount</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={row.amount}
                  onChange={(e) => updateRow(index, { amount: e.target.value })}
                  className="pl-9 font-mono"
                  aria-label={`Amount for row ${index + 1}`}
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="sm:hidden">Category</Label>
              <Select
                value={row.categoryId}
                onValueChange={(v) => updateRow(index, { categoryId: v ?? "" })}
                items={categories.map((c) => ({ value: c.id, label: c.name }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="sm:hidden">Date</Label>
              <Input
                type="date"
                value={row.date}
                onChange={(e) => updateRow(index, { date: e.target.value })}
                aria-label={`Date for row ${index + 1}`}
              />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label className="sm:hidden">Note</Label>
              <Input
                type="text"
                placeholder="Optional note"
                value={row.note}
                onChange={(e) => updateRow(index, { note: e.target.value })}
                aria-label={`Note for row ${index + 1}`}
              />
            </div>

            {/* Remove */}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(index)}
                aria-label={`Remove row ${index + 1}`}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Button type="button" variant="outline" onClick={addRow}>
          <Plus className="mr-2 h-4 w-4" />
          Add row
        </Button>
        <Button onClick={handleSave} disabled={isPending || filledCount === 0}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            `Save all${filledCount > 0 ? ` (${filledCount})` : ""}`
          )}
        </Button>
      </div>
    </div>
  );
}

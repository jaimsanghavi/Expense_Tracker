"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, IndianRupee, Loader2 } from "lucide-react";
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
import { createExpense } from "@/app/(app)/expenses/actions";

type Category = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
};

interface QuickAddProps {
  categories: Category[];
}

export function QuickAddFab({ categories }: QuickAddProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function reset() {
    setAmount("");
    setCategoryId("");
    setNote("");
    setError(null);
  }

  function handleSubmit() {
    if (!amount || Number(amount) <= 0) {
      setError("Enter an amount");
      return;
    }

    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("amount", amount);
      // Use current datetime
      const now = new Date();
      const offset = now.getTimezoneOffset();
      const local = new Date(now.getTime() - offset * 60000);
      formData.set("spent_at", local.toISOString().slice(0, 16));
      formData.set("category_id", categoryId);
      formData.set("payment_method_id", "");
      formData.set("merchant", "");
      formData.set("note", note);
      formData.set("is_split", "false");

      const result = await createExpense(formData);
      if (result?.error) {
        const firstError = Object.values(result.error)[0];
        setError(
          Array.isArray(firstError) ? firstError[0] : String(firstError)
        );
        return;
      }

      reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-8 md:right-8"
        aria-label="Quick add expense"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Modal backdrop + panel */}
      {open && (
        <div className="fixed inset-0 z-60 flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl border bg-card p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Quick Add</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="qa-amount">Amount</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="qa-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-9 font-mono text-lg"
                    autoFocus
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={categoryId}
                  onValueChange={(v) => v && setCategoryId(v)}
                  items={categories.map((c) => ({ value: c.id, label: c.name }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <CategoryIcon
                            icon={c.icon}
                            color={c.color}
                            size="sm"
                          />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label htmlFor="qa-note">Note (optional)</Label>
                <Input
                  id="qa-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What was this for?"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={isPending || !amount}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

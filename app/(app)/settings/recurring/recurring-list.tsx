"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR, toRupees } from "@/lib/money";
import { formatDateIST } from "@/lib/dates";
import {
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  toggleRecurringExpense,
  getRecurringExpenses,
} from "./actions";

type RecurringExpense = {
  id: string;
  amount_paise: number;
  cadence: string;
  next_run_at: string;
  note: string | null;
  is_active: boolean;
  category_id: string | null;
  payment_method_id: string | null;
  categories: { id: string; name: string } | null;
  payment_methods: { id: string; name: string; type: string } | null;
};

type Category = { id: string; name: string };
type PaymentMethod = { id: string; name: string; type: string };

const CADENCES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;

function cadenceLabel(cadence: string) {
  return CADENCES.find((c) => c.value === cadence)?.label ?? cadence;
}

export function RecurringList({
  initialRecurring,
  categories,
  paymentMethods,
}: {
  initialRecurring: RecurringExpense[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
}) {
  const [items, setItems] = useState(initialRecurring);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const [selectedCadence, setSelectedCadence] = useState<string>("monthly");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("");
  const [isPending, startTransition] = useTransition();

  function handleEdit(item: RecurringExpense) {
    setEditing(item);
    setSelectedCadence(item.cadence);
    setSelectedCategory(item.category_id ?? "");
    setSelectedPaymentMethod(item.payment_method_id ?? "");
    setDialogOpen(true);
  }

  function handleAdd() {
    setEditing(null);
    setSelectedCadence("monthly");
    setSelectedCategory("");
    setSelectedPaymentMethod("");
    setDialogOpen(true);
  }

  async function handleSubmit(formData: FormData) {
    formData.set("cadence", selectedCadence);
    formData.set("category_id", selectedCategory);
    formData.set("payment_method_id", selectedPaymentMethod);
    if (editing) {
      formData.set("is_active", String(editing.is_active));
    }

    startTransition(async () => {
      let result;
      if (editing) {
        result = await updateRecurringExpense(editing.id, formData);
      } else {
        result = await createRecurringExpense(formData);
      }

      if (!result?.error) {
        setDialogOpen(false);
        setEditing(null);
        const updated = await getRecurringExpenses();
        setItems(updated);
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this recurring expense?"))
      return;
    startTransition(async () => {
      await deleteRecurringExpense(id);
      setItems((prev) => prev.filter((r) => r.id !== id));
    });
  }

  async function handleToggle(id: string) {
    startTransition(async () => {
      await toggleRecurringExpense(id);
      const updated = await getRecurringExpenses();
      setItems(updated);
    });
  }

  // Format next_run_at as local date string for the date input default value
  function toDateInputValue(isoString: string): string {
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recurring Expenses</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" onClick={handleAdd} />}>
            <Plus className="size-4 mr-1" />
            Add Recurring
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing
                  ? "Edit Recurring Expense"
                  : "New Recurring Expense"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update the recurring expense details below."
                  : "Set up an expense that repeats automatically."}
              </DialogDescription>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={
                    editing ? toRupees(editing.amount_paise) : ""
                  }
                  placeholder="e.g. 500"
                />
              </div>
              <div className="space-y-2">
                <Label>Cadence</Label>
                <Select
                  value={selectedCadence}
                  onValueChange={(v) => v && setSelectedCadence(v)}
                  items={CADENCES.map((c) => ({ value: c.value, label: c.label }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select cadence" />
                  </SelectTrigger>
                  <SelectContent>
                    {CADENCES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(v) => setSelectedCategory(v ?? "")}
                  items={[
                    { value: "", label: "None" },
                    ...categories.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={selectedPaymentMethod}
                  onValueChange={(v) => setSelectedPaymentMethod(v ?? "")}
                  items={[
                    { value: "", label: "None" },
                    ...paymentMethods.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {paymentMethods.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="next_run_at">Next Run Date</Label>
                <Input
                  id="next_run_at"
                  name="next_run_at"
                  type="date"
                  required
                  defaultValue={
                    editing ? toDateInputValue(editing.next_run_at) : ""
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note (optional)</Label>
                <textarea
                  id="note"
                  name="note"
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  maxLength={500}
                  defaultValue={editing?.note ?? ""}
                  placeholder="e.g. Netflix subscription"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending
                    ? "Saving..."
                    : editing
                      ? "Update"
                      : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No recurring expenses yet. Add one to get started.
        </p>
      ) : (
        <div className="divide-y rounded-lg border bg-card">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30 ${
                !item.is_active ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg shrink-0 bg-primary/10 text-primary">
                  <Repeat className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatINR(item.amount_paise)}
                    </span>
                    <Badge variant="secondary">
                      {cadenceLabel(item.cadence)}
                    </Badge>
                    {!item.is_active && (
                      <Badge variant="outline">Paused</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {item.categories && (
                      <span>{item.categories.name}</span>
                    )}
                    {item.categories && item.payment_methods && (
                      <span>·</span>
                    )}
                    {item.payment_methods && (
                      <span>{item.payment_methods.name}</span>
                    )}
                    {(item.categories || item.payment_methods) && (
                      <span>·</span>
                    )}
                    <span>Next: {formatDateIST(item.next_run_at)}</span>
                    {item.note && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[150px]">
                          {item.note}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Switch
                  checked={item.is_active}
                  onCheckedChange={() => handleToggle(item.id)}
                  disabled={isPending}
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleEdit(item)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

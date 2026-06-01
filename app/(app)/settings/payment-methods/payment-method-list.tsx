"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CreditCard, Smartphone, Banknote, Wallet, Building2, Globe, type LucideIcon } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from "./actions";

const PAYMENT_TYPES = [
  { value: "upi", label: "UPI" },
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "cash", label: "Cash" },
  { value: "net_banking", label: "Net Banking" },
  { value: "wallet", label: "Wallet" },
  { value: "other", label: "Other" },
] as const;

type PaymentMethod = {
  id: string;
  name: string;
  type: string;
  provider: string | null;
  last_four: string | null;
};

function typeLabel(type: string) {
  return PAYMENT_TYPES.find((t) => t.value === type)?.label ?? type;
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  upi: Smartphone,
  credit_card: CreditCard,
  debit_card: CreditCard,
  cash: Banknote,
  net_banking: Building2,
  wallet: Wallet,
  other: Globe,
};

const TYPE_COLORS: Record<string, string> = {
  upi: "#8b5cf6",
  credit_card: "#f59e0b",
  debit_card: "#06b6d4",
  cash: "#10b981",
  net_banking: "#3b82f6",
  wallet: "#ec4899",
  other: "#6b7280",
};

export function PaymentMethodList({
  initialPaymentMethods,
}: {
  initialPaymentMethods: PaymentMethod[];
}) {
  const [methods, setMethods] = useState(initialPaymentMethods);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [selectedType, setSelectedType] = useState<string>("upi");
  const [isPending, startTransition] = useTransition();

  const showLastFour = selectedType === "credit_card" || selectedType === "debit_card";

  function handleEdit(method: PaymentMethod) {
    setEditing(method);
    setSelectedType(method.type);
    setDialogOpen(true);
  }

  function handleAdd() {
    setEditing(null);
    setSelectedType("upi");
    setDialogOpen(true);
  }

  async function handleSubmit(formData: FormData) {
    formData.set("type", selectedType);
    if (!showLastFour) {
      formData.delete("last_four");
    }

    startTransition(async () => {
      let result;
      if (editing) {
        result = await updatePaymentMethod(editing.id, formData);
      } else {
        result = await createPaymentMethod(formData);
      }

      if (!result?.error) {
        toast.success(editing ? "Payment method updated" : "Payment method added");
        setDialogOpen(false);
        setEditing(null);
        const { getPaymentMethods } = await import("./actions");
        const updated = await getPaymentMethods();
        setMethods(updated);
      } else {
        toast.error("Couldn't save payment method");
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this payment method?")) return;
    startTransition(async () => {
      try {
        await deletePaymentMethod(id);
        setMethods((prev) => prev.filter((m) => m.id !== id));
        toast.success("Payment method deleted");
      } catch {
        toast.error("Couldn't delete payment method");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Payment Methods</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" onClick={handleAdd} />}>
            <Plus className="size-4 mr-1" />
            Add Method
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit Payment Method" : "New Payment Method"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update the payment method details below."
                  : "Add a new payment method."}
              </DialogDescription>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={editing?.name ?? ""}
                  placeholder="e.g. HDFC Credit Card"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={selectedType}
                  onValueChange={(v) => v && setSelectedType(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type">
                      {(value: string | null) => PAYMENT_TYPES.find((t) => t.value === value)?.label ?? "Select type"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider">Provider (optional)</Label>
                <Input
                  id="provider"
                  name="provider"
                  defaultValue={editing?.provider ?? ""}
                  placeholder="e.g. HDFC, Google Pay"
                />
              </div>
              {showLastFour && (
                <div className="space-y-2">
                  <Label htmlFor="last_four">Last 4 digits</Label>
                  <Input
                    id="last_four"
                    name="last_four"
                    defaultValue={editing?.last_four ?? ""}
                    placeholder="1234"
                    maxLength={4}
                    pattern="[0-9]{4}"
                  />
                </div>
              )}
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

      {methods.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No payment methods yet. Add one to get started.
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {methods.map((method) => (
            <div
              key={method.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = TYPE_ICONS[method.type] ?? Globe;
                  const color = TYPE_COLORS[method.type] ?? "#6b7280";
                  return (
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  );
                })()}
                <span className="text-sm font-medium">{method.name}</span>
                <Badge variant="secondary">{typeLabel(method.type)}</Badge>
                {method.provider && (
                  <span className="text-xs text-muted-foreground">
                    {method.provider}
                  </span>
                )}
                {method.last_four && (
                  <span className="text-xs text-muted-foreground">
                    ••••{method.last_four}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleEdit(method)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(method.id)}
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

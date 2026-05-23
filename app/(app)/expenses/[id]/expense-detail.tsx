"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Check,
  Gift,
  IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatINR, toRupees } from "@/lib/money";
import { formatDateTimeIST, utcToISTLocal } from "@/lib/dates";
import { updateExpense, deleteExpense } from "../actions";
import { updateShareStatus } from "./actions";
import { ReceiptUpload } from "../receipt-upload";

type Share = {
  id: string;
  friend_id: string;
  share_paise: number;
  status: string;
  settled_at: string | null;
  note: string | null;
  friends: { id: string; name: string } | null;
};

type Expense = {
  id: string;
  amount_paise: number;
  spent_at: string;
  merchant: string | null;
  note: string | null;
  receipt_path: string | null;
  is_split: boolean;
  paid_by: string | null;
  categories: { id: string; name: string; color: string | null; icon: string | null } | null;
  payment_methods: { id: string; name: string; type: string } | null;
  expense_shares: Share[];
};

type Category = { id: string; name: string; color: string | null; icon: string | null };
type PaymentMethod = { id: string; name: string; type: string };

interface ExpenseDetailProps {
  expense: Expense;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  userId: string;
}

export function ExpenseDetail({
  expense,
  categories,
  paymentMethods,
  userId,
}: ExpenseDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit form state
  const [amount, setAmount] = useState(toRupees(expense.amount_paise).toString());
  const [spentAt, setSpentAt] = useState(() => utcToISTLocal(expense.spent_at));
  const [categoryId, setCategoryId] = useState(
    expense.categories?.id ?? ""
  );
  const [paymentMethodId, setPaymentMethodId] = useState(
    expense.payment_methods?.id ?? ""
  );
  const [merchant, setMerchant] = useState(expense.merchant ?? "");
  const [note, setNote] = useState(expense.note ?? "");
  const [error, setError] = useState<Record<string, string[]> | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("amount", amount);
      formData.set("spent_at", spentAt);
      formData.set("category_id", categoryId);
      formData.set("payment_method_id", paymentMethodId);
      formData.set("merchant", merchant);
      formData.set("note", note);

      const result = await updateExpense(expense.id, formData);
      if (result?.error) {
        setError(result.error as Record<string, string[]>);
      } else {
        setIsEditing(false);
        router.refresh();
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteExpense(expense.id);
      router.push("/expenses");
    });
  }

  function handleShareStatus(shareId: string, status: "paid" | "gift") {
    startTransition(async () => {
      await updateShareStatus(shareId, status);
      router.refresh();
    });
  }

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    gift: "bg-purple-100 text-purple-800",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/expenses"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex gap-2">
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Button>
          )}
          {!showDeleteConfirm ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Delete
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
              >
                Confirm
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Detail / Edit view */}
      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Expense</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-9 font-mono"
                />
              </div>
              {error?.amount && (
                <p className="text-sm text-destructive">{error.amount[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-date">Date &amp; Time</Label>
              <Input
                id="edit-date"
                type="datetime-local"
                value={spentAt}
                onChange={(e) => setSpentAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
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
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={paymentMethodId}
                onValueChange={(v) => v && setPaymentMethodId(v)}
                items={paymentMethods.map((pm) => ({ value: pm.id, label: pm.name }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>
                      {pm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-merchant">Merchant</Label>
              <Input
                id="edit-merchant"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-note">Note</Label>
              <Textarea
                id="edit-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Amount */}
            <div className="text-center">
              {expense.is_split && expense.expense_shares.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">Your share</p>
                  <p className="text-3xl font-bold font-mono">
                    {formatINR(
                      !expense.paid_by
                        ? expense.amount_paise - expense.expense_shares.reduce((s, sh) => s + sh.share_paise, 0)
                        : expense.amount_paise
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    of {formatINR(expense.amount_paise)} total · {formatDateTimeIST(expense.spent_at)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold font-mono">
                    {formatINR(expense.amount_paise)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDateTimeIST(expense.spent_at)}
                  </p>
                </>
              )}
            </div>

            <Separator />

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {expense.categories && (
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="flex items-center gap-1.5 font-medium">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          expense.categories.color ?? "#94a3b8",
                      }}
                    />
                    {expense.categories.name}
                  </p>
                </div>
              )}
              {expense.payment_methods && (
                <div>
                  <p className="text-muted-foreground">Payment</p>
                  <p className="font-medium">
                    {expense.payment_methods.name}
                  </p>
                </div>
              )}
              {expense.merchant && (
                <div>
                  <p className="text-muted-foreground">Merchant</p>
                  <p className="font-medium">{expense.merchant}</p>
                </div>
              )}
              {expense.note && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Note</p>
                  <p className="font-medium">{expense.note}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Receipt */}
      <ReceiptUpload
        expenseId={expense.id}
        userId={userId}
        existingPath={expense.receipt_path}
      />

      {/* Shares section */}
      {expense.is_split && expense.expense_shares.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Split Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expense.expense_shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {share.friends?.name ?? "Unknown"}
                    </p>
                    <p className="font-mono text-sm">
                      {formatINR(share.share_paise)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={statusColor[share.status] ?? ""}
                      variant="secondary"
                    >
                      {share.status}
                    </Badge>
                    {share.status === "pending" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShareStatus(share.id, "paid")}
                          disabled={isPending}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Paid
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShareStatus(share.id, "gift")}
                          disabled={isPending}
                        >
                          <Gift className="mr-1 h-3 w-3" />
                          Gift
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

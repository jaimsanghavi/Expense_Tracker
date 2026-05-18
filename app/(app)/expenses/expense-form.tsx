"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { IndianRupee } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { DateTimePicker } from "@/components/datetime-picker";
import { createExpense } from "./actions";
import { toPaise, formatINR } from "@/lib/money";
import { splitEqual, splitByPercentage, validateShares } from "@/lib/splits";

type Category = { id: string; name: string; color: string | null; icon: string | null };
type PaymentMethod = { id: string; name: string; type: string };
type Friend = { id: string; name: string };

interface ExpenseFormProps {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  friends: Friend[];
}

export function ExpenseForm({
  categories,
  paymentMethods,
  friends,
}: ExpenseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [amount, setAmount] = useState("");
  const [spentAt, setSpentAt] = useState(() => {
    const now = new Date();
    // Format for datetime-local input
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  });
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");

  // Split state
  const [isSplit, setIsSplit] = useState(false);
  const [paidBy, setPaidBy] = useState<string>(""); // empty = user paid
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<"equal" | "amount" | "percent">(
    "equal"
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    {}
  );
  const [customPercents, setCustomPercents] = useState<Record<string, string>>(
    {}
  );
  const [error, setError] = useState<Record<string, string[]> | null>(null);

  const amountPaise = amount ? toPaise(amount) : 0;

  // Compute shares based on mode
  function getShares(): { friend_id: string; share_paise: number }[] | null {
    if (!isSplit || selectedFriends.length === 0) return null;

    // Total people splitting = selected friends + the user
    const totalPeople = selectedFriends.length + 1;

    if (splitMode === "equal") {
      const parts = splitEqual(amountPaise, totalPeople);
      // User's share is parts[0] (not stored), friends get the rest
      return selectedFriends.map((fid, i) => ({
        friend_id: fid,
        share_paise: parts[i + 1],
      }));
    }

    if (splitMode === "amount") {
      return selectedFriends.map((fid) => ({
        friend_id: fid,
        share_paise: toPaise(customAmounts[fid] || "0"),
      }));
    }

    if (splitMode === "percent") {
      const percents = selectedFriends.map((fid) =>
        Number(customPercents[fid] || 0)
      );
      const paises = splitByPercentage(amountPaise, percents);
      return selectedFriends.map((fid, i) => ({
        friend_id: fid,
        share_paise: paises[i],
      }));
    }

    return null;
  }

  function getSharesValidationError(): string | null {
    const shares = getShares();
    if (!shares) return null;
    const sharePaises = shares.map((s) => s.share_paise);
    return validateShares(sharePaises, amountPaise);
  }

  function handleSubmit() {
    setError(null);
    const validationErr = getSharesValidationError();
    if (validationErr) {
      setError({ shares: [validationErr] });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("amount", amount);
      formData.set("spent_at", spentAt);
      formData.set("category_id", categoryId);
      formData.set("payment_method_id", paymentMethodId);
      formData.set("merchant", merchant);
      formData.set("note", note);
      formData.set("is_split", isSplit.toString());
      if (paidBy) formData.set("paid_by", paidBy);

      const shares = getShares();
      if (shares) {
        formData.set("shares", JSON.stringify(shares));
      }

      const result = await createExpense(formData);
      if (result?.error) {
        setError(result.error as Record<string, string[]>);
      } else {
        router.push("/expenses");
      }
    });
  }

  const equalShareDisplay =
    isSplit && selectedFriends.length > 0 && amountPaise > 0
      ? splitEqual(amountPaise, selectedFriends.length + 1)
      : null;

  return (
    <div className="space-y-6">
      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <div className="relative">
          <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="amount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-9 font-mono"
          />
        </div>
        {error?.amount && (
          <p className="text-sm text-destructive">{error.amount[0]}</p>
        )}
        {error?.amount_paise && (
          <p className="text-sm text-destructive">{error.amount_paise[0]}</p>
        )}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="spent_at">Date &amp; Time</Label>
        <DateTimePicker
          id="spent_at"
          value={spentAt}
          onChange={(v) => setSpentAt(v)}
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select category">
              {(value: string | null) => {
                const cat = categories.find((c) => c.id === value);
                if (!cat) return "Select category";
                return (
                  <span className="flex items-center gap-2">
                    <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />
                    {cat.name}
                  </span>
                );
              }}
            </SelectValue>
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

      {/* Payment Method */}
      <div className="space-y-2">
        <Label>Payment Method</Label>
        <Select value={paymentMethodId} onValueChange={(v) => v && setPaymentMethodId(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select payment method">
              {(value: string | null) => paymentMethods.find((pm) => pm.id === value)?.name ?? "Select payment method"}
            </SelectValue>
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

      {/* Merchant */}
      <div className="space-y-2">
        <Label htmlFor="merchant">Merchant (optional)</Label>
        <Input
          id="merchant"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="e.g. Swiggy, Amazon"
        />
      </div>

      {/* Note */}
      <div className="space-y-2">
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Any additional details..."
          rows={2}
        />
      </div>

      <Separator />

      {/* Split section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch checked={isSplit} onCheckedChange={setIsSplit} />
          <Label>Split this expense</Label>
        </div>

        {isSplit && (
          <div className="space-y-4 rounded-lg border p-4">
            {/* Who paid */}
            <div className="space-y-2">
              <Label>Who paid?</Label>
              <Select value={paidBy} onValueChange={(v) => setPaidBy(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="I paid" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">I paid</SelectItem>
                  {friends.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Friend selection */}
            <div className="space-y-2">
              <Label>Split with</Label>
              <div className="grid grid-cols-2 gap-2">
                {friends.map((f) => (
                  <label
                    key={f.id}
                    className="flex cursor-pointer items-center gap-2 rounded border p-2 text-sm hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFriends.includes(f.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFriends((prev) => [...prev, f.id]);
                        } else {
                          setSelectedFriends((prev) =>
                            prev.filter((id) => id !== f.id)
                          );
                        }
                      }}
                      className="rounded"
                    />
                    {f.name}
                  </label>
                ))}
              </div>
              {friends.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No friends added yet. Add friends in Settings.
                </p>
              )}
            </div>

            {/* Split mode */}
            {selectedFriends.length > 0 && (
              <>
                <div className="space-y-2">
                  <Label>Split type</Label>
                  <div className="flex gap-2">
                    {(
                      [
                        ["equal", "Equal"],
                        ["amount", "Custom Amount"],
                        ["percent", "Custom %"],
                      ] as const
                    ).map(([value, label]) => (
                      <Button
                        key={value}
                        type="button"
                        variant={splitMode === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSplitMode(value)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Share details */}
                <div className="space-y-2">
                  {splitMode === "equal" && equalShareDisplay && (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>You</span>
                        <span className="font-mono">
                          {formatINR(equalShareDisplay[0])}
                        </span>
                      </div>
                      {selectedFriends.map((fid, i) => {
                        const friend = friends.find((f) => f.id === fid);
                        return (
                          <div
                            key={fid}
                            className="flex justify-between text-muted-foreground"
                          >
                            <span>{friend?.name}</span>
                            <span className="font-mono">
                              {formatINR(equalShareDisplay[i + 1])}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {splitMode === "amount" &&
                    selectedFriends.map((fid) => {
                      const friend = friends.find((f) => f.id === fid);
                      return (
                        <div key={fid} className="flex items-center gap-2">
                          <span className="w-24 truncate text-sm">
                            {friend?.name}
                          </span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={customAmounts[fid] ?? ""}
                            onChange={(e) =>
                              setCustomAmounts((prev) => ({
                                ...prev,
                                [fid]: e.target.value,
                              }))
                            }
                            className="font-mono"
                          />
                        </div>
                      );
                    })}

                  {splitMode === "percent" &&
                    selectedFriends.map((fid) => {
                      const friend = friends.find((f) => f.id === fid);
                      return (
                        <div key={fid} className="flex items-center gap-2">
                          <span className="w-24 truncate text-sm">
                            {friend?.name}
                          </span>
                          <Input
                            type="number"
                            inputMode="numeric"
                            placeholder="0"
                            value={customPercents[fid] ?? ""}
                            onChange={(e) =>
                              setCustomPercents((prev) => ({
                                ...prev,
                                [fid]: e.target.value,
                              }))
                            }
                            className="font-mono"
                          />
                          <span className="text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                      );
                    })}
                </div>

                {error?.shares && (
                  <p className="text-sm text-destructive">{error.shares[0]}</p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={isPending || !amount}
        className="w-full"
      >
        {isPending ? "Saving..." : "Save Expense"}
      </Button>
    </div>
  );
}

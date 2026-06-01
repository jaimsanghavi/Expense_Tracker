"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Handshake,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatINR } from "@/lib/money";
import { formatDateIST } from "@/lib/dates";
import { createSettlement, type LedgerEntry } from "../actions";

type Friend = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  upi_handle: string | null;
};

interface FriendLedgerProps {
  friend: Friend;
  ledger: LedgerEntry[];
}

export function FriendLedger({ friend, ledger }: FriendLedgerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [settleOpen, setSettleOpen] = useState(false);

  // Compute net balance from ledger
  // Only count pending shares — FIFO marks settled shares as 'paid'
  // Positive = friend owes us, negative = we owe friend
  const netBalance = ledger.reduce((acc, entry) => {
    if (entry.type === "expense" && entry.status === "pending") {
      if (!entry.paid_by) {
        // We paid → friend owes us this share
        return acc + entry.share_paise;
      }
      // Friend paid → we owe them
      return acc - entry.share_paise;
    }
    return acc;
  }, 0);

  async function handleSettle(formData: FormData) {
    formData.set("friend_id", friend.id);
    if (!formData.get("settled_at")) {
      formData.set("settled_at", new Date().toISOString());
    }
    startTransition(async () => {
      const result = await createSettlement(formData);
      if (result?.success) {
        toast.success("Settlement recorded");
        setSettleOpen(false);
        router.refresh();
      } else if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  function statusBadge(status: string) {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "paid":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>;
      case "gift":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Gift</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-5 w-5" />
            <h1 className="text-2xl font-bold">{friend.name}</h1>
          </div>
          <div className="text-sm text-muted-foreground space-y-0.5">
            {friend.phone && <p>{friend.phone}</p>}
            {friend.email && <p>{friend.email}</p>}
            {friend.upi_handle && <p>UPI: {friend.upi_handle}</p>}
          </div>
        </div>
        <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
          <DialogTrigger render={<Button />}>
            <Handshake className="h-4 w-4 mr-2" />
            Settle Up
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Settle Up with {friend.name}</DialogTitle>
              <DialogDescription>
                Record a payment settlement.
              </DialogDescription>
            </DialogHeader>
            <form action={handleSettle} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  required
                  defaultValue={
                    netBalance !== 0
                      ? (Math.abs(netBalance) / 100).toFixed(2)
                      : undefined
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="direction">Direction *</Label>
                <Select name="direction" required defaultValue={netBalance > 0 ? "from_friend" : netBalance < 0 ? "to_friend" : undefined} items={[{value:"from_friend",label:"They paid me"},{value:"to_friend",label:"I paid them"}]}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="from_friend">They paid me</SelectItem>
                    <SelectItem value="to_friend">I paid them</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Payment Method</Label>
                <Select name="method" items={[{value:"upi",label:"UPI"},{value:"cash",label:"Cash"},{value:"net_banking",label:"Net Banking"},{value:"wallet",label:"Wallet"},{value:"other",label:"Other"}]}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="net_banking">Net Banking</SelectItem>
                    <SelectItem value="wallet">Wallet</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Input id="note" name="note" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Recording..." : "Record Settlement"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Net Balance */}
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground mb-1">Net Balance</p>
        {netBalance > 0 ? (
          <p className="text-2xl font-bold text-green-600">
            {friend.name} owes you {formatINR(netBalance)}
          </p>
        ) : netBalance < 0 ? (
          <p className="text-2xl font-bold text-red-600">
            You owe {friend.name} {formatINR(Math.abs(netBalance))}
          </p>
        ) : (
          <p className="text-2xl font-bold text-muted-foreground">
            All settled up!
          </p>
        )}
      </div>

      <Separator />

      {/* Ledger */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Ledger</h2>
        {ledger.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No transactions yet.
          </p>
        ) : (
          <div className="space-y-2">
            {ledger.map((entry) => {
              if (entry.type === "expense") {
                return (
                  <div
                    key={`expense-${entry.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-l-4 border-l-orange-400"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {entry.merchant || entry.note || "Expense"}
                        </span>
                        {statusBadge(entry.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDateIST(entry.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatINR(entry.share_paise)}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={`settlement-${entry.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-l-4 border-l-green-500"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {entry.direction === "from_friend" ? (
                        <ArrowDownLeft className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">Settlement</span>
                      {entry.note && (
                        <span className="text-sm text-muted-foreground">
                          — {entry.note}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDateIST(entry.date)}
                      {entry.method && ` · ${entry.method}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-medium ${
                        entry.direction === "from_friend"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {entry.direction === "from_friend" ? "+" : "-"}
                      {formatINR(entry.amount_paise)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  IndianRupee,
  Upload,
  Camera,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { DateTimePicker } from "@/components/datetime-picker";
import { createExpense, updateExpenseReceipt } from "./actions";
import { toPaise, formatINR } from "@/lib/money";
import { splitEqual, splitByPercentage, validateShares } from "@/lib/splits";
import { nowISTLocalString } from "@/lib/dates";

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

type Category = { id: string; name: string; color: string | null; icon: string | null };
type PaymentMethod = { id: string; name: string; type: string };
type Friend = { id: string; name: string };

interface ExpenseFormProps {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  friends: Friend[];
  userId: string;
}

export function ExpenseForm({
  categories,
  paymentMethods,
  friends,
  userId,
}: ExpenseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [amount, setAmount] = useState("");
  const [spentAt, setSpentAt] = useState(() => nowISTLocalString());
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

  // Receipt & OCR state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [ocrConfidence, setOcrConfidence] = useState(0);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const amountPaise = amount ? toPaise(amount) : 0;

  // Receipt handling
  async function handleReceiptSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setOcrError("Only image files (JPG, PNG, WebP, HEIC) are supported.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setOcrError("File must be under 5MB.");
      return;
    }

    setReceiptFile(file);
    setOcrError(null);
    setOcrStatus("idle");

    // Convert HEIC to JPEG for preview and OCR
    let previewFile = file;
    if (file.type === "image/heic") {
      try {
        const heic2any = (await import("heic2any")).default;
        const blob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.85,
        });
        const converted = Array.isArray(blob) ? blob[0] : blob;
        previewFile = new File([converted], file.name.replace(/\.heic$/i, ".jpg"), {
          type: "image/jpeg",
        });
        setReceiptFile(previewFile);
      } catch {
        // Fall through — OCR can still handle HEIC server-side
      }
    }

    // Show preview
    if (previewFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setReceiptPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(previewFile);
    } else {
      setReceiptPreview(null);
    }

    // Run OCR
    setOcrStatus("loading");
    setOcrLoading(true);

    try {
      const fd = new FormData();
      fd.set("file", file);

      const res = await fetch("/api/ocr", { method: "POST", body: fd });

      if (!res.ok) {
        const data = await res.json();
        setOcrError(data.error || "OCR failed");
        setOcrStatus("error");
        return;
      }

      const data = await res.json();
      setOcrConfidence(data.confidence ?? 0);
      setOcrStatus("success");

      // Pre-fill form fields with OCR results
      if (data.amount) setAmount(data.amount);
      if (data.merchant) setMerchant(data.merchant);
      if (data.note) setNote(data.note);
      if (data.categoryId) setCategoryId(data.categoryId);
      if (data.paymentMethodId) setPaymentMethodId(data.paymentMethodId);

      if (data.date) {
        const time = data.time || "12:00";
        setSpentAt(`${data.date}T${time}`);
      }
    } catch {
      setOcrError("Failed to process receipt. Fill in details manually.");
      setOcrStatus("error");
    } finally {
      setOcrLoading(false);
    }
  }

  function removeReceipt() {
    setReceiptFile(null);
    setReceiptPreview(null);
    setOcrStatus("idle");
    setOcrError(null);
    setOcrConfidence(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

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
        return;
      }

      // Upload receipt to storage if we have one
      if (receiptFile && result.expenseId) {
        const { createClient: createBrowserClient } = await import(
          "@/lib/supabase/client"
        );
        const supabase = createBrowserClient();
        const filePath = `${userId}/${result.expenseId}/${receiptFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(filePath, receiptFile, { upsert: true });

        if (!uploadError) {
          // Save receipt path to the expense
          await updateExpenseReceipt(result.expenseId, filePath);
        }
      }

      toast.success("Expense added");
      router.push("/expenses");
    });
  }

  const equalShareDisplay =
    isSplit && selectedFriends.length > 0 && amountPaise > 0
      ? splitEqual(amountPaise, selectedFriends.length + 1)
      : null;

  return (
    <div className="space-y-6">
      {/* Receipt Upload (top of form for OCR-first flow) */}
      <Card className="border-dashed">
        <CardContent className="pt-6 space-y-3">
          <Label className="text-base font-medium flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Scan Receipt
          </Label>
          <p className="text-sm text-muted-foreground">
            Upload a receipt photo to auto-fill expense details
          </p>

          {!receiptFile ? (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-primary/50 hover:bg-muted/50">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Tap to upload receipt image
              </span>
              <span className="text-xs text-muted-foreground/60">
                JPG, PNG, WebP, HEIC · Max 5MB
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                capture="environment"
                onChange={handleReceiptSelect}
                className="hidden"
              />
            </label>
          ) : (
            <div className="space-y-3">
              {/* Preview */}
              <div className="relative rounded-lg border overflow-hidden">
                {receiptPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="max-h-48 w-full object-contain bg-muted"
                  />
                )}
                <button
                  type="button"
                  onClick={removeReceipt}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* OCR Status */}
              {ocrStatus === "loading" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing receipt...
                </div>
              )}
              {ocrStatus === "success" && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Details extracted (confidence: {ocrConfidence}%) — review
                  below
                </div>
              )}
              {ocrStatus === "error" && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {ocrError}
                </div>
              )}
            </div>
          )}

          {ocrError && !receiptFile && (
            <p className="text-sm text-destructive">{ocrError}</p>
          )}
        </CardContent>
      </Card>

      <Separator />

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
        <Select
          value={paymentMethodId}
          onValueChange={(v) => v && setPaymentMethodId(v)}
          items={paymentMethods.map((pm) => ({ value: pm.id, label: pm.name }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select payment method" />
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
              <Select
                value={paidBy}
                onValueChange={(v) => setPaidBy(v ?? "")}
                items={[
                  { value: "", label: "I paid" },
                  ...friends.map((f) => ({ value: f.id, label: f.name })),
                ]}
              >
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

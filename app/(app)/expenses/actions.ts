"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { expenseSchema } from "@/lib/schemas";
import { toPaise } from "@/lib/money";
import { sendPushToUser } from "@/lib/push";
import { formatINR } from "@/lib/money";
import { monthStartUTC, monthEndUTC, istLocalToUTC } from "@/lib/dates";

export async function getExpenses(filters?: {
  month?: string;
  categoryId?: string;
  paymentMethodId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  let query = supabase
    .from("expenses")
    .select(
      `
      *,
      categories(id, name, color, icon),
      payment_methods(id, name, type),
      expense_shares(share_paise)
    `
    )
    .eq("user_id", user.id)
    .order("spent_at", { ascending: false });

  if (filters?.month) {
    // month is in format "YYYY-MM"
    const [year, month] = filters.month.split("-").map(Number);
    const monthDate = new Date(year, month - 1, 1);
    const start = monthStartUTC(monthDate).toISOString();
    const end = monthEndUTC(monthDate).toISOString();
    query = query.gte("spent_at", start).lte("spent_at", end);
  }

  if (filters?.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  if (filters?.paymentMethodId) {
    query = query.eq("payment_method_id", filters.paymentMethodId);
  }

  if (filters?.search) {
    query = query.or(
      `note.ilike.%${filters.search}%,merchant.ilike.%${filters.search}%`
    );
  }

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createExpense(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const amountRupees = formData.get("amount") as string;
  const spentAt = formData.get("spent_at") as string;
  const categoryId = (formData.get("category_id") as string) || null;
  const paymentMethodId =
    (formData.get("payment_method_id") as string) || null;
  const merchant = (formData.get("merchant") as string) || null;
  const note = (formData.get("note") as string) || null;
  const isSplit = formData.get("is_split") === "true";
  const paidBy = (formData.get("paid_by") as string) || null;
  const sharesJson = formData.get("shares") as string;

  const amountPaise = toPaise(amountRupees);

  const parsed = expenseSchema.safeParse({
    amount_paise: amountPaise,
    spent_at: istLocalToUTC(spentAt),
    category_id: categoryId,
    payment_method_id: paymentMethodId,
    merchant,
    note,
    is_split: isSplit,
    paid_by: paidBy,
    shares: sharesJson ? JSON.parse(sharesJson) : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  if (isSplit && parsed.data.shares && parsed.data.shares.length > 0) {
    const { data: expenseId, error } = await supabase.rpc("create_expense_with_shares", {
      p_amount_paise: parsed.data.amount_paise,
      p_spent_at: parsed.data.spent_at,
      p_category_id: parsed.data.category_id,
      p_payment_method_id: parsed.data.payment_method_id,
      p_merchant: parsed.data.merchant,
      p_note: parsed.data.note,
      p_paid_by: parsed.data.paid_by,
      p_shares: JSON.stringify(parsed.data.shares),
    });

    if (error) return { error: { amount: [error.message] } };

    revalidatePath("/expenses");
    revalidatePath("/dashboard");

    // Trigger large expense notification (non-blocking)
    triggerLargeExpenseNotification(user.id, parsed.data.amount_paise, parsed.data.merchant ?? null);

    return { error: null, expenseId: expenseId as string };
  } else {
    const { data, error } = await supabase.from("expenses").insert({
      user_id: user.id,
      amount_paise: parsed.data.amount_paise,
      spent_at: parsed.data.spent_at,
      category_id: parsed.data.category_id,
      payment_method_id: parsed.data.payment_method_id,
      merchant: parsed.data.merchant,
      note: parsed.data.note,
      is_split: false,
      paid_by: null,
    }).select("id").single();

    if (error) return { error: { amount: [error.message] } };

    revalidatePath("/expenses");
    revalidatePath("/dashboard");

    // Trigger large expense notification (non-blocking)
    triggerLargeExpenseNotification(user.id, parsed.data.amount_paise, parsed.data.merchant ?? null);

    return { error: null, expenseId: data.id as string };
  }
}

async function triggerLargeExpenseNotification(
  userId: string,
  amountPaise: number,
  merchant: string | null
) {
  try {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("notify_large_expense, notify_large_expense_threshold_paise")
      .eq("id", userId)
      .single();

    if (
      !profile?.notify_large_expense ||
      amountPaise < (profile.notify_large_expense_threshold_paise ?? 500000)
    ) {
      return;
    }

    const amount = formatINR(amountPaise);
    await sendPushToUser(userId, {
      title: "Large Expense Alert",
      body: merchant
        ? `${amount} spent at ${merchant}`
        : `${amount} expense recorded`,
      tag: "large-expense",
      url: "/expenses",
    });
  } catch {
    // Non-critical — don't fail the expense creation
  }
}

export async function updateExpense(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const amountRupees = formData.get("amount") as string;
  const spentAt = formData.get("spent_at") as string;
  const categoryId = (formData.get("category_id") as string) || null;
  const paymentMethodId =
    (formData.get("payment_method_id") as string) || null;
  const merchant = (formData.get("merchant") as string) || null;
  const note = (formData.get("note") as string) || null;

  const amountPaise = toPaise(amountRupees);

  const parsed = expenseSchema.safeParse({
    amount_paise: amountPaise,
    spent_at: istLocalToUTC(spentAt),
    category_id: categoryId,
    payment_method_id: paymentMethodId,
    merchant,
    note,
    is_split: false,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase
    .from("expenses")
    .update({
      amount_paise: parsed.data.amount_paise,
      spent_at: parsed.data.spent_at,
      category_id: parsed.data.category_id,
      payment_method_id: parsed.data.payment_method_id,
      merchant: parsed.data.merchant,
      note: parsed.data.note,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: { amount: [error.message] } };

  revalidatePath("/expenses");
  revalidatePath(`/expenses/${id}`);
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function updateExpenseReceipt(
  expenseId: string,
  receiptPath: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("expenses")
    .update({ receipt_path: receiptPath })
    .eq("id", expenseId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/expenses/${expenseId}`);
  return { error: null };
}

export async function removeExpenseReceipt(expenseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Get the current receipt path so we can delete the file
  const { data: expense } = await supabase
    .from("expenses")
    .select("receipt_path")
    .eq("id", expenseId)
    .eq("user_id", user.id)
    .single();

  if (expense?.receipt_path) {
    await supabase.storage.from("receipts").remove([expense.receipt_path]);
  }

  const { error } = await supabase
    .from("expenses")
    .update({ receipt_path: null })
    .eq("id", expenseId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/expenses/${expenseId}`);
  return { error: null };
}

export async function getReceiptUrl(receiptPath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase.storage
    .from("receipts")
    .createSignedUrl(receiptPath, 3600); // 1 hour

  if (error) return { url: null, error: error.message };
  return { url: data.signedUrl, error: null };
}

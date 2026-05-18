"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { expenseSchema } from "@/lib/schemas";
import { toPaise } from "@/lib/money";

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
      payment_methods(id, name, type)
    `
    )
    .eq("user_id", user.id)
    .order("spent_at", { ascending: false });

  if (filters?.month) {
    // month is in format "YYYY-MM"
    const [year, month] = filters.month.split("-").map(Number);
    const start = new Date(year, month - 1, 1).toISOString();
    const end = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
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
    spent_at: new Date(spentAt).toISOString(),
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
    const { error } = await supabase.rpc("create_expense_with_shares", {
      p_user_id: user.id,
      p_amount_paise: parsed.data.amount_paise,
      p_spent_at: parsed.data.spent_at,
      p_category_id: parsed.data.category_id,
      p_payment_method_id: parsed.data.payment_method_id,
      p_merchant: parsed.data.merchant,
      p_note: parsed.data.note,
      p_is_split: true,
      p_paid_by: parsed.data.paid_by,
      p_shares: JSON.stringify(parsed.data.shares),
    });

    if (error) return { error: { amount: [error.message] } };
  } else {
    const { error } = await supabase.from("expenses").insert({
      user_id: user.id,
      amount_paise: parsed.data.amount_paise,
      spent_at: parsed.data.spent_at,
      category_id: parsed.data.category_id,
      payment_method_id: parsed.data.payment_method_id,
      merchant: parsed.data.merchant,
      note: parsed.data.note,
      is_split: false,
      paid_by: null,
    });

    if (error) return { error: { amount: [error.message] } };
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { error: null };
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
    spent_at: new Date(spentAt).toISOString(),
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

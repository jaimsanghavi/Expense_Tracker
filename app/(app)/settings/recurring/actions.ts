"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { recurringExpenseSchema } from "@/lib/schemas";
import { toPaise } from "@/lib/money";
import { istLocalToUTC } from "@/lib/dates";

/** Interpret a date-only (or datetime-local) "next run" input as IST → UTC ISO. */
function nextRunToUTC(value: FormDataEntryValue | null): string {
  if (!value) return "";
  const s = value as string;
  return istLocalToUTC(s.includes("T") ? s : `${s}T00:00`);
}

export async function getRecurringExpenses() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("recurring_expenses")
    .select("*, categories(id, name), payment_methods(id, name, type)")
    .eq("user_id", user.id)
    .order("next_run_at");

  if (error) throw new Error(error.message);
  return data;
}

export async function createRecurringExpense(formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");

  const amount = formData.get("amount");
  const parsed = recurringExpenseSchema.safeParse({
    amount_paise: amount ? toPaise(Number(amount)) : 0,
    category_id: formData.get("category_id") || null,
    payment_method_id: formData.get("payment_method_id") || null,
    cadence: formData.get("cadence"),
    next_run_at: nextRunToUTC(formData.get("next_run_at")),
    note: formData.get("note") || null,
    is_active: true,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase.from("recurring_expenses").insert({
    user_id: user.id,
    ...parsed.data,
  });

  if (error) return { error: { amount_paise: [error.message] } };

  revalidatePath("/settings/recurring");
  return { error: null };
}

export async function updateRecurringExpense(id: string, formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");

  const amount = formData.get("amount");
  const parsed = recurringExpenseSchema.safeParse({
    amount_paise: amount ? toPaise(Number(amount)) : 0,
    category_id: formData.get("category_id") || null,
    payment_method_id: formData.get("payment_method_id") || null,
    cadence: formData.get("cadence"),
    next_run_at: nextRunToUTC(formData.get("next_run_at")),
    note: formData.get("note") || null,
    is_active: formData.get("is_active") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase
    .from("recurring_expenses")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: { amount_paise: [error.message] } };

  revalidatePath("/settings/recurring");
  return { error: null };
}

export async function deleteRecurringExpense(id: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("recurring_expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/recurring");
}

export async function toggleRecurringExpense(id: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");

  // Fetch current state
  const { data: current, error: fetchError } = await supabase
    .from("recurring_expenses")
    .select("is_active")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("recurring_expenses")
    .update({ is_active: !current.is_active })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/recurring");
}

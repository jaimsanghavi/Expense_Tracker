"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getExpense(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("expenses")
    .select(
      `
      *,
      categories(id, name, color, icon),
      payment_methods(id, name, type),
      expense_shares(id, friend_id, share_paise, status, settled_at, note, friends(id, name))
    `
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateShareStatus(
  shareId: string,
  status: "paid" | "gift"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("expense_shares")
    .update({
      status,
      settled_at: new Date().toISOString(),
    })
    .eq("id", shareId);

  if (error) throw new Error(error.message);

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

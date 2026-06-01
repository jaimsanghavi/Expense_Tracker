"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return { error: "Not authenticated" };

  const displayName = formData.get("display_name") as string;
  const budgetStr = formData.get("monthly_budget") as string;
  const monthlyBudgetPaise = budgetStr ? Math.round(parseFloat(budgetStr) * 100) : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      monthly_budget_paise: monthlyBudgetPaise,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings/profile");
  return { success: true };
}

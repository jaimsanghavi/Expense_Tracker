"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { paymentMethodSchema } from "@/lib/schemas";

export async function getPaymentMethods() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("name");

  if (error) throw new Error(error.message);
  return data;
}

export async function createPaymentMethod(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const parsed = paymentMethodSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    provider: formData.get("provider") || undefined,
    last_four: formData.get("last_four") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase.from("payment_methods").insert({
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    provider: parsed.data.provider ?? null,
    last_four: parsed.data.last_four ?? null,
  });

  if (error) return { error: { name: [error.message] } };

  revalidatePath("/settings/payment-methods");
  return { error: null };
}

export async function updatePaymentMethod(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const parsed = paymentMethodSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    provider: formData.get("provider") || undefined,
    last_four: formData.get("last_four") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase
    .from("payment_methods")
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      provider: parsed.data.provider ?? null,
      last_four: parsed.data.last_four ?? null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: { name: [error.message] } };

  revalidatePath("/settings/payment-methods");
  return { error: null };
}

export async function deletePaymentMethod(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("payment_methods")
    .update({ is_archived: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/payment-methods");
}

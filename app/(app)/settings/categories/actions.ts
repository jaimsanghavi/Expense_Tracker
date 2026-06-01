"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/schemas";

export async function getCategories() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("name");

  if (error) throw new Error(error.message);
  return data;
}

export async function createCategory(formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    icon: formData.get("icon") || undefined,
    color: formData.get("color") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name: parsed.data.name,
    icon: parsed.data.icon ?? null,
    color: parsed.data.color ?? null,
  });

  if (error) return { error: { name: [error.message] } };

  revalidatePath("/settings/categories");
  return { error: null };
}

export async function updateCategory(id: string, formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    icon: formData.get("icon") || undefined,
    color: formData.get("color") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase
    .from("categories")
    .update({
      name: parsed.data.name,
      icon: parsed.data.icon ?? null,
      color: parsed.data.color ?? null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: { name: [error.message] } };

  revalidatePath("/settings/categories");
  return { error: null };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("categories")
    .update({ is_archived: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/categories");
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function subscribePush(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) return { error: error.message };
  return { error: null };
}

export async function unsubscribePush(endpoint: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) return { error: error.message };
  return { error: null };
}

export async function getNotificationPreferences() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "notify_large_expense, notify_large_expense_threshold_paise, notify_recurring_due"
    )
    .eq("id", user.id)
    .single();

  if (error) return null;
  return data;
}

export async function updateNotificationPreferences(prefs: {
  notify_large_expense?: boolean;
  notify_large_expense_threshold_paise?: number;
  notify_recurring_due?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("profiles")
    .update(prefs)
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings/notifications");
  return { error: null };
}

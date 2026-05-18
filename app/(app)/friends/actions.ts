"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendSchema, settlementSchema } from "@/lib/schemas";
import { toPaise } from "@/lib/money";

export async function getFriends() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("friend_balances")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    // Fallback: fetch friends directly if view doesn't exist
    const { data: friends, error: friendsErr } = await supabase
      .from("friends")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("name");

    if (friendsErr) throw new Error(friendsErr.message);
    return (friends ?? []).map((f) => ({
      friend_id: f.id,
      name: f.name,
      net_owed_to_me_paise: 0,
    }));
  }

  return data ?? [];
}

export async function getFriend(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("friends")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createFriend(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const raw = {
    name: formData.get("name") as string,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    upi_handle: (formData.get("upi_handle") as string) || null,
  };

  const parsed = friendSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.from("friends").insert({
    user_id: user.id,
    ...parsed.data,
  });

  if (error) return { error: error.message };

  revalidatePath("/friends");
  return { success: true };
}

export async function updateFriend(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const raw = {
    name: formData.get("name") as string,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    upi_handle: (formData.get("upi_handle") as string) || null,
  };

  const parsed = friendSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("friends")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/friends");
  revalidatePath(`/friends/${id}`);
  return { success: true };
}

export async function deleteFriend(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("friends")
    .update({ is_archived: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/friends");
  return { success: true };
}

export type LedgerEntry =
  | {
      type: "expense";
      id: string;
      date: string;
      note: string | null;
      merchant: string | null;
      share_paise: number;
      status: string;
    }
  | {
      type: "settlement";
      id: string;
      date: string;
      amount_paise: number;
      direction: string;
      method: string | null;
      note: string | null;
    };

export async function getFriendLedger(friendId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Fetch expense shares for this friend
  const { data: shares, error: sharesErr } = await supabase
    .from("expense_shares")
    .select(
      `
      id,
      share_paise,
      status,
      expenses(id, spent_at, note, merchant)
    `
    )
    .eq("user_id", user.id)
    .eq("friend_id", friendId);

  if (sharesErr) throw new Error(sharesErr.message);

  // Fetch settlements for this friend
  const { data: settlements, error: settlementsErr } = await supabase
    .from("settlements")
    .select("*")
    .eq("user_id", user.id)
    .eq("friend_id", friendId);

  if (settlementsErr) throw new Error(settlementsErr.message);

  const ledger: LedgerEntry[] = [];

  for (const share of shares ?? []) {
    const expense = share.expenses as unknown as {
      id: string;
      spent_at: string;
      note: string | null;
      merchant: string | null;
    };
    if (!expense) continue;
    ledger.push({
      type: "expense",
      id: share.id,
      date: expense.spent_at,
      note: expense.note,
      merchant: expense.merchant,
      share_paise: share.share_paise,
      status: share.status,
    });
  }

  for (const s of settlements ?? []) {
    ledger.push({
      type: "settlement",
      id: s.id,
      date: s.settled_at,
      amount_paise: s.amount_paise,
      direction: s.direction,
      method: s.method,
      note: s.note,
    });
  }

  // Sort by date descending
  ledger.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return ledger;
}

export async function createSettlement(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const amountRupees = formData.get("amount") as string;
  const raw = {
    friend_id: formData.get("friend_id") as string,
    amount_paise: toPaise(amountRupees),
    direction: formData.get("direction") as string,
    method: (formData.get("method") as string) || null,
    note: (formData.get("note") as string) || null,
    settled_at: formData.get("settled_at") as string || new Date().toISOString(),
  };

  const parsed = settlementSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Insert settlement
  const { error: insertErr } = await supabase.from("settlements").insert({
    user_id: user.id,
    ...parsed.data,
  });

  if (insertErr) return { error: insertErr.message };

  // FIFO: mark oldest pending expense_shares as 'paid'
  let remaining = parsed.data.amount_paise;

  const { data: pendingShares } = await supabase
    .from("expense_shares")
    .select("id, share_paise")
    .eq("user_id", user.id)
    .eq("friend_id", parsed.data.friend_id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  for (const share of pendingShares ?? []) {
    if (remaining <= 0) break;
    if (share.share_paise <= remaining) {
      await supabase
        .from("expense_shares")
        .update({ status: "paid", settled_at: new Date().toISOString() })
        .eq("id", share.id);
      remaining -= share.share_paise;
    } else {
      // Partial — don't mark as paid if settlement doesn't fully cover
      break;
    }
  }

  revalidatePath(`/friends/${parsed.data.friend_id}`);
  revalidatePath("/friends");
  return { success: true };
}

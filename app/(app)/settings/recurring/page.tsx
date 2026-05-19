import { createClient } from "@/lib/supabase/server";
import { getRecurringExpenses } from "./actions";
import { RecurringList } from "./recurring-list";

export default async function RecurringPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const [recurringExpenses, { data: categories }, { data: paymentMethods }] =
    await Promise.all([
      getRecurringExpenses(),
      supabase
        .from("categories")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .order("name"),
      supabase
        .from("payment_methods")
        .select("id, name, type")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .order("name"),
    ]);

  return (
    <RecurringList
      initialRecurring={recurringExpenses}
      categories={categories ?? []}
      paymentMethods={paymentMethods ?? []}
    />
  );
}

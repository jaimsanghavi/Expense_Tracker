import { getCategories } from "@/app/(app)/settings/categories/actions";
import { getPaymentMethods } from "@/app/(app)/settings/payment-methods/actions";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { ExpenseForm } from "../expense-form";

async function getFriends() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("friends")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export default async function NewExpensePage() {
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");

  const [categories, paymentMethods, friends] = await Promise.all([
    getCategories(),
    getPaymentMethods(),
    getFriends(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">New Expense</h1>
      <ExpenseForm
        categories={categories}
        paymentMethods={paymentMethods}
        friends={friends}
        userId={user.id}
      />
    </div>
  );
}

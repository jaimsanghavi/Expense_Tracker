import { getCategories } from "@/app/(app)/settings/categories/actions";
import { getCurrentUser } from "@/lib/supabase/server";
import { BulkExpenseForm } from "./bulk-form";

export default async function BulkExpensePage() {
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");

  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bulk Add Expenses</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Quickly enter several personal expenses at once
        </p>
      </div>
      <BulkExpenseForm categories={categories} />
    </div>
  );
}

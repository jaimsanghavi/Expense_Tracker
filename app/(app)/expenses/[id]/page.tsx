import { notFound } from "next/navigation";
import { getExpense } from "./actions";
import { getCategories } from "@/app/(app)/settings/categories/actions";
import { getPaymentMethods } from "@/app/(app)/settings/payment-methods/actions";
import { ExpenseDetail } from "./expense-detail";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let expense;
  try {
    expense = await getExpense(id);
  } catch {
    notFound();
  }

  const [categories, paymentMethods] = await Promise.all([
    getCategories(),
    getPaymentMethods(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ExpenseDetail
        expense={expense}
        categories={categories}
        paymentMethods={paymentMethods}
      />
    </div>
  );
}

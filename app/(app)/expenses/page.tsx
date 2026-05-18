import { getExpenses } from "./actions";
import { getCategories } from "@/app/(app)/settings/categories/actions";
import { getPaymentMethods } from "@/app/(app)/settings/payment-methods/actions";
import { ExpenseList } from "./expense-list";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const month = typeof params.month === "string" ? params.month : undefined;
  const categoryId =
    typeof params.categoryId === "string" ? params.categoryId : undefined;
  const paymentMethodId =
    typeof params.paymentMethodId === "string"
      ? params.paymentMethodId
      : undefined;
  const search =
    typeof params.search === "string" ? params.search : undefined;

  const [expenses, categories, paymentMethods] = await Promise.all([
    getExpenses({ month, categoryId, paymentMethodId, search }),
    getCategories(),
    getPaymentMethods(),
  ]);

  return (
    <ExpenseList
      initialExpenses={expenses}
      categories={categories}
      paymentMethods={paymentMethods}
      filters={{ month, categoryId, paymentMethodId, search }}
    />
  );
}

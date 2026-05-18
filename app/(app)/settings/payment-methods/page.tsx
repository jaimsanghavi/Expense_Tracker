import { getPaymentMethods } from "./actions";
import { PaymentMethodList } from "./payment-method-list";

export default async function PaymentMethodsPage() {
  const paymentMethods = await getPaymentMethods();

  return <PaymentMethodList initialPaymentMethods={paymentMethods} />;
}

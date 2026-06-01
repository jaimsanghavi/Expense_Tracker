/** Convert rupees (number or string) to paise (integer). */
export const toPaise = (rupees: number | string): number => {
  const n = Number(rupees);
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid amount: ${JSON.stringify(rupees)}`);
  }
  return Math.round(n * 100);
};

/** Convert paise to rupees (float). */
export const toRupees = (paise: number): number => paise / 100;

const inrFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

/** Format paise as INR string with Indian grouping (₹1,23,456.78). */
export const formatINR = (paise: number): string => inrFmt.format(toRupees(paise));

/** Format paise as plain number string (no currency symbol). */
export const formatAmount = (paise: number): string =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(
    toRupees(paise)
  );

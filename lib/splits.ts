/**
 * Splits `totalPaise` equally among `n` people, distributing the remainder
 * paisa-by-paisa to the first few shares so the sum exactly equals total.
 */
export function splitEqual(totalPaise: number, n: number): number[] {
  if (n <= 0) throw new Error("n must be > 0");
  const base = Math.floor(totalPaise / n);
  const remainder = totalPaise - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Validates that custom shares sum to exactly the expected total.
 * Returns an error message or null if valid.
 */
export function validateShares(
  shares: number[],
  totalPaise: number
): string | null {
  const sum = shares.reduce((a, b) => a + b, 0);
  if (sum > totalPaise) return "Sum of shares exceeds total expense amount";
  if (sum <= 0) return "Shares must be positive";
  if (shares.some((s) => s <= 0)) return "Each share must be positive";
  return null;
}

/**
 * Splits totalPaise by percentages. Percentages should sum to 100 (or less).
 * Distributes rounding remainders to first shares.
 */
export function splitByPercentage(
  totalPaise: number,
  percentages: number[]
): number[] {
  const rawShares = percentages.map((p) => Math.floor((totalPaise * p) / 100));
  const remainder = totalPaise - rawShares.reduce((a, b) => a + b, 0);
  // Distribute remainder to first N shares
  return rawShares.map((s, i) => s + (i < remainder ? 1 : 0));
}

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
 * Splits totalPaise by percentages. Percentages must be non-negative and sum
 * to at most 100; any shortfall below 100 is the payer's share and is NOT
 * distributed onto these shares. Only the sub-paisa rounding remainder is
 * spread across the first shares so they total exactly their allocated portion.
 */
export function splitByPercentage(
  totalPaise: number,
  percentages: number[]
): number[] {
  if (percentages.some((p) => p < 0)) {
    throw new Error("Percentages must be non-negative");
  }
  const sumPct = percentages.reduce((a, b) => a + b, 0);
  if (sumPct > 100) {
    throw new Error("Percentages must not exceed 100");
  }
  // The amount these shares should cover; the remainder belongs to the payer.
  const target = Math.round((totalPaise * sumPct) / 100);
  const rawShares = percentages.map((p) => Math.floor((totalPaise * p) / 100));
  const remainder = target - rawShares.reduce((a, b) => a + b, 0);
  // Distribute only the rounding remainder (< number of shares) to the first shares.
  return rawShares.map((s, i) => s + (i < remainder ? 1 : 0));
}

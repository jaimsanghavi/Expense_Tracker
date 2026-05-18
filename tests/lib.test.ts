import { describe, it, expect } from "vitest";
import { toPaise, toRupees, formatINR } from "@/lib/money";
import { splitEqual, validateShares, splitByPercentage } from "@/lib/splits";

describe("money", () => {
  it("converts rupees to paise", () => {
    expect(toPaise(100)).toBe(10000);
    expect(toPaise("1.50")).toBe(150);
    expect(toPaise(0.01)).toBe(1);
  });

  it("converts paise to rupees", () => {
    expect(toRupees(10000)).toBe(100);
    expect(toRupees(150)).toBe(1.5);
  });

  it("formats INR with Indian grouping", () => {
    expect(formatINR(12345678)).toBe("₹1,23,456.78");
    expect(formatINR(100)).toBe("₹1.00");
    expect(formatINR(0)).toBe("₹0.00");
  });
});

describe("splits", () => {
  it("splits equally with no remainder", () => {
    expect(splitEqual(300, 3)).toEqual([100, 100, 100]);
  });

  it("distributes remainder to first shares", () => {
    expect(splitEqual(100, 3)).toEqual([34, 33, 33]);
  });

  it("throws on n <= 0", () => {
    expect(() => splitEqual(100, 0)).toThrow();
  });

  it("validates shares correctly", () => {
    expect(validateShares([50, 50], 100)).toBeNull();
    expect(validateShares([60, 50], 100)).toBe(
      "Sum of shares exceeds total expense amount"
    );
    expect(validateShares([0, 50], 100)).toBe("Each share must be positive");
  });

  it("splits by percentage", () => {
    const result = splitByPercentage(1000, [50, 30, 20]);
    expect(result).toEqual([500, 300, 200]);
  });

  it("splits by percentage with rounding", () => {
    const result = splitByPercentage(100, [33, 33, 34]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
  });
});

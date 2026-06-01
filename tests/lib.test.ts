import { describe, it, expect } from "vitest";
import { toPaise, toRupees, formatINR } from "@/lib/money";
import { splitEqual, validateShares, splitByPercentage } from "@/lib/splits";
import { monthRangeUTC, yearRangeUTC, formatISTDateLabel } from "@/lib/dates";
import { computeNextRunUTC, planRecurringRuns } from "@/lib/recurring";
import { sanitizeSearchTerm } from "@/lib/search";
import { friendNetBalancePaise } from "@/lib/balance";
import { parseTransactionSms } from "@/lib/sms";
import { expenseExportRows } from "@/lib/export";
import { normalizeBulkRows, isBlankBulkRow } from "@/lib/bulk";

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

  it("rejects non-numeric amounts instead of producing NaN", () => {
    expect(() => toPaise("abc")).toThrow();
    expect(() => toPaise(NaN)).toThrow();
    expect(() => toPaise(Infinity)).toThrow();
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

  it("only allocates the given portion when percentages sum below 100", () => {
    // Two friends at 30% each of ₹10 should owe ₹3 each — the remaining 40%
    // is the user's share, NOT dumped onto the friends.
    expect(splitByPercentage(1000, [30, 30])).toEqual([300, 300]);
  });

  it("distributes only the rounding remainder within the allocated target", () => {
    // 10 paise at 33/33/34% → raw floors [3,3,3]=9, 1 paise remainder to first.
    expect(splitByPercentage(10, [33, 33, 34])).toEqual([4, 3, 3]);
  });

  it("throws when percentages exceed 100", () => {
    expect(() => splitByPercentage(1000, [60, 60])).toThrow();
  });

  it("throws on a negative percentage", () => {
    expect(() => splitByPercentage(1000, [-10, 50])).toThrow();
  });
});

describe("date ranges (IST, half-open)", () => {
  it("returns IST month start (inclusive) and next-month start (exclusive) as UTC", () => {
    // Any instant within May 2026 IST should yield the same window.
    const { start, end } = monthRangeUTC(new Date("2026-05-15T00:00:00Z"));
    expect(start).toBe("2026-04-30T18:30:00.000Z"); // 2026-05-01 00:00 IST
    expect(end).toBe("2026-05-31T18:30:00.000Z"); // 2026-06-01 00:00 IST
  });

  it("spans the December→January boundary correctly", () => {
    const { start, end } = monthRangeUTC(new Date("2026-12-10T00:00:00Z"));
    expect(start).toBe("2026-11-30T18:30:00.000Z"); // 2026-12-01 00:00 IST
    expect(end).toBe("2026-12-31T18:30:00.000Z"); // 2027-01-01 00:00 IST
  });

  it("returns IST year start (inclusive) and next-year start (exclusive) as UTC", () => {
    const { start, end } = yearRangeUTC(2026);
    expect(start).toBe("2025-12-31T18:30:00.000Z"); // 2026-01-01 00:00 IST
    expect(end).toBe("2026-12-31T18:30:00.000Z"); // 2027-01-01 00:00 IST
  });

  it("formats an IST date-only string without timezone parsing", () => {
    expect(formatISTDateLabel("2026-05-01")).toBe("1 May 2026");
    expect(formatISTDateLabel("2026-12-31")).toBe("31 Dec 2026");
  });
});

describe("recurring next-run (IST)", () => {
  const may15IST = "2026-05-14T18:30:00.000Z"; // 2026-05-15 00:00 IST

  it("advances daily by one IST day", () => {
    expect(computeNextRunUTC(may15IST, "daily")).toBe("2026-05-15T18:30:00.000Z");
  });

  it("advances weekly by seven IST days", () => {
    expect(computeNextRunUTC(may15IST, "weekly")).toBe("2026-05-21T18:30:00.000Z");
  });

  it("advances monthly preserving the IST day-of-month", () => {
    expect(computeNextRunUTC(may15IST, "monthly")).toBe("2026-06-14T18:30:00.000Z");
  });

  it("advances yearly", () => {
    expect(computeNextRunUTC(may15IST, "yearly")).toBe("2027-05-14T18:30:00.000Z");
  });

  it("clamps month-end overflow (Jan 31 -> Feb 28) in IST", () => {
    const jan31IST = "2026-01-30T18:30:00.000Z"; // 2026-01-31 00:00 IST
    expect(computeNextRunUTC(jan31IST, "monthly")).toBe("2026-02-27T18:30:00.000Z"); // 2026-02-28 00:00 IST
  });
});

describe("planRecurringRuns", () => {
  const nowISO = "2026-05-20T00:00:00.000Z";

  it("returns no runs when next_run_at is in the future", () => {
    const future = "2026-05-25T00:00:00.000Z";
    const { runs, nextRunAt } = planRecurringRuns(future, "daily", nowISO);
    expect(runs).toEqual([]);
    expect(nextRunAt).toBe(future); // unchanged
  });

  it("returns a single run when exactly due now", () => {
    const { runs, nextRunAt } = planRecurringRuns(nowISO, "daily", nowISO);
    expect(runs).toEqual([nowISO]);
    expect(nextRunAt).toBe("2026-05-21T00:00:00.000Z"); // advanced past now
  });

  it("materializes one run per missed daily period when overdue", () => {
    // 3 days overdue: 05-18, 05-19, 05-20 are due; 05-21 is the next future run.
    const { runs, nextRunAt } = planRecurringRuns(
      "2026-05-18T00:00:00.000Z",
      "daily",
      nowISO
    );
    expect(runs).toEqual([
      "2026-05-18T00:00:00.000Z",
      "2026-05-19T00:00:00.000Z",
      "2026-05-20T00:00:00.000Z",
    ]);
    expect(nextRunAt).toBe("2026-05-21T00:00:00.000Z");
    expect(new Date(nextRunAt).getTime()).toBeGreaterThan(
      new Date(nowISO).getTime()
    );
  });

  it("caps the number of catch-up runs for a far-overdue daily schedule", () => {
    // Years overdue: without a cap this would produce thousands of runs.
    const farPast = "2020-01-01T00:00:00.000Z";
    const { runs } = planRecurringRuns(farPast, "daily", nowISO);
    expect(runs).toHaveLength(60); // default cap
    expect(runs[0]).toBe(farPast); // oldest first

    const capped = planRecurringRuns(farPast, "daily", nowISO, 5);
    expect(capped.runs).toHaveLength(5);
    expect(capped.nextRunAt).toBe("2020-01-06T00:00:00.000Z"); // 5 days later
  });
});

describe("search term sanitization", () => {
  it("passes ordinary search text through unchanged", () => {
    expect(sanitizeSearchTerm("coffee")).toBe("coffee");
    expect(sanitizeSearchTerm("blue bottle")).toBe("blue bottle");
  });

  it("strips PostgREST filter-grammar characters to prevent injection", () => {
    // Commas separate filters and parens group them — both must be removed so a
    // search value can't break out of the ilike pattern.
    expect(sanitizeSearchTerm("a,note.ilike.*")).toBe("anote.ilike.*");
    expect(sanitizeSearchTerm("x)or(paid_by.not.is.null")).toBe(
      "xorpaid_by.not.is.null"
    );
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeSearchTerm("  tea  ")).toBe("tea");
  });
});

describe("friend net balance (Model B, settlement-aware)", () => {
  it("adds pending shares the friend owes me (I paid)", () => {
    expect(
      friendNetBalancePaise([
        { type: "expense", status: "pending", paid_by: null, share_paise: 1000 },
      ])
    ).toBe(1000);
  });

  it("subtracts pending shares I owe (friend paid)", () => {
    expect(
      friendNetBalancePaise([
        { type: "expense", status: "pending", paid_by: "f1", share_paise: 1000 },
      ])
    ).toBe(-1000);
  });

  it("ignores non-pending shares", () => {
    expect(
      friendNetBalancePaise([
        { type: "expense", status: "paid", paid_by: null, share_paise: 1000 },
      ])
    ).toBe(0);
  });

  it("subtracts a from_friend settlement (they paid me back) — the bug", () => {
    // Friend owed me ₹10; they settled ₹10 → net 0.
    expect(
      friendNetBalancePaise([
        { type: "expense", status: "pending", paid_by: null, share_paise: 1000 },
        { type: "settlement", direction: "from_friend", amount_paise: 1000 },
      ])
    ).toBe(0);
  });

  it("handles a partial from_friend settlement", () => {
    expect(
      friendNetBalancePaise([
        { type: "expense", status: "pending", paid_by: null, share_paise: 1000 },
        { type: "settlement", direction: "from_friend", amount_paise: 600 },
      ])
    ).toBe(400);
  });

  it("adds a to_friend settlement (I paid them back)", () => {
    // I owed friend ₹10; I settled ₹10 → net 0.
    expect(
      friendNetBalancePaise([
        { type: "expense", status: "pending", paid_by: "f1", share_paise: 1000 },
        { type: "settlement", direction: "to_friend", amount_paise: 1000 },
      ])
    ).toBe(0);
  });
});

describe("parseTransactionSms", () => {
  it("parses a UPI debit with 'to MERCHANT' and a decimal amount", () => {
    // "debited" wins over the later "credited"; merchant comes from "to SWIGGY"
    // and terminates at " on ".
    expect(
      parseTransactionSms(
        "Rs.500.00 debited from a/c XX1234 and credited to SWIGGY on 20-05-26. UPI Ref 123"
      )
    ).toEqual({ amountPaise: 50000, merchant: "SWIGGY", kind: "debit" });
  });

  it("parses an INR card spend with thousands comma and 'at MERCHANT'", () => {
    expect(
      parseTransactionSms("INR 1,234.56 spent on your HDFC Card at AMAZON on 19-05")
    ).toEqual({ amountPaise: 123456, merchant: "AMAZON", kind: "debit" });
  });

  it("parses a ₹ UPI payment terminating the merchant at ' via '", () => {
    expect(parseTransactionSms("₹250 paid to Zomato via UPI")).toEqual({
      amountPaise: 25000,
      merchant: "Zomato",
      kind: "debit", // "paid" => debit
    });
  });

  it("treats a generic 'to your account' as no merchant on a credit", () => {
    expect(parseTransactionSms("Rs 2000 credited to your account")).toEqual({
      amountPaise: 200000,
      merchant: null,
      kind: "credit",
    });
  });

  it("returns all nulls for a message with no transaction amount", () => {
    expect(parseTransactionSms("Your OTP is 123456")).toEqual({
      amountPaise: null,
      merchant: null,
      kind: null,
    });
  });

  it("never throws on empty or non-string input", () => {
    expect(parseTransactionSms("")).toEqual({
      amountPaise: null,
      merchant: null,
      kind: null,
    });
    expect(
      parseTransactionSms(undefined as unknown as string)
    ).toEqual({ amountPaise: null, merchant: null, kind: null });
  });
});

describe("expenseExportRows", () => {
  it("maps a full expense (joined relations as objects) to an ExportRow", () => {
    const rows = expenseExportRows([
      {
        amount_paise: 12345678, // ₹1,23,456.78
        spent_at: "2026-05-18T06:00:00.000Z", // 18 May 2026 IST
        merchant: "Blue Bottle",
        note: "Morning coffee",
        categories: { name: "Food" },
        payment_methods: { name: "HDFC Card" },
      },
    ]);
    expect(rows).toEqual([
      {
        date: "18 May 2026",
        merchant: "Blue Bottle",
        category: "Food",
        paymentMethod: "HDFC Card",
        amount: 123456.78,
        note: "Morning coffee",
      },
    ]);
  });

  it("uses empty strings for missing merchant/category/payment/note", () => {
    const [row] = expenseExportRows([
      {
        amount_paise: 5000, // ₹50.00
        spent_at: "2026-01-31T20:00:00.000Z", // 1 Feb 2026 IST (UTC+5:30 rollover)
        merchant: null,
        note: null,
        categories: null,
        payment_methods: null,
      },
    ]);
    expect(row).toEqual({
      date: "1 Feb 2026",
      merchant: "",
      category: "",
      paymentMethod: "",
      amount: 50,
      note: "",
    });
  });

  it("reads joined names when relations arrive as arrays (PostgREST embedding)", () => {
    const [row] = expenseExportRows([
      {
        amount_paise: 10000, // ₹100.00 — a split expense
        spent_at: "2026-05-10T10:00:00.000Z",
        merchant: "Dinner",
        note: "",
        categories: [{ name: "Dining" }],
        payment_methods: [{ name: "UPI" }],
      },
    ]);
    expect(row.category).toBe("Dining");
    expect(row.paymentMethod).toBe("UPI");
    expect(row.amount).toBe(100);
    expect(row.merchant).toBe("Dinner");
  });
});

describe("normalizeBulkRows", () => {
  it("flags rows without an amount as blank", () => {
    expect(isBlankBulkRow({ amount: "", date: "2026-05-18", categoryId: "", note: "" })).toBe(true);
    expect(isBlankBulkRow({ amount: "  ", date: "2026-05-18", categoryId: "", note: "" })).toBe(true);
    expect(isBlankBulkRow({ amount: "100", date: "2026-05-18", categoryId: "", note: "" })).toBe(false);
  });

  it("drops blank rows and converts the IST date to UTC at IST midnight", () => {
    const result = normalizeBulkRows([
      { amount: "100", date: "2026-05-18", categoryId: "c1", note: "lunch" },
      { amount: "", date: "2026-05-19", categoryId: "", note: "" },
    ]);
    expect(result).toEqual([
      {
        amount: "100",
        spent_at: "2026-05-17T18:30:00.000Z", // 2026-05-18 00:00 IST
        category_id: "c1",
        note: "lunch",
      },
    ]);
  });

  it("normalizes empty category and note to null and trims values", () => {
    const [row] = normalizeBulkRows([
      { amount: " 250 ", date: "2026-05-18", categoryId: "", note: "  " },
    ]);
    expect(row.category_id).toBeNull();
    expect(row.note).toBeNull();
    expect(row.amount).toBe("250");
  });
});

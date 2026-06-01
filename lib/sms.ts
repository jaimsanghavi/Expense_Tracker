import { toPaise } from "@/lib/money";

export interface ParsedSms {
  amountPaise: number | null; // null if no amount found
  merchant: string | null; // best-effort; null if none
  kind: "debit" | "credit" | null;
}

// Matches a money amount preceded by Rs / Rs. / INR / ₹ (optional space),
// with optional thousands commas and an optional decimal part.
// e.g. "Rs.1,234.56", "INR 500", "₹99.00", "Rs 2000".
const AMOUNT_RE =
  /(?:rs\.?|inr|₹)\s*((?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?)/i;

const DEBIT_RE = /\b(?:debited|spent|paid|debit|withdrawn)\b/i;
const CREDIT_RE = /\b(?:credited|received|credit|deposited)\b/i;

// Capture the text after " at " or " to " up to the next terminator:
//   " on " | "." | ";" | " via " | "UPI" | newline | end-of-string.
const MERCHANT_RE =
  /\s(?:at|to)\s+(.+?)(?:\s+on\s|\s+via\s|\s*UPI|[.;\n]|$)/i;

// Generic transfer destinations that aren't real merchants
// (e.g. "credited to your account"). Treated as "no merchant".
const GENERIC_DEST_RE = /^(?:your\s+)?(?:a\/c|acc(?:oun)?t|wallet)\b/i;

/**
 * Best-effort parser for Indian bank / UPI transaction SMS messages.
 * Never throws — returns nulls for any field it can't confidently extract.
 */
export function parseTransactionSms(text: string): ParsedSms {
  const result: ParsedSms = {
    amountPaise: null,
    merchant: null,
    kind: null,
  };

  if (typeof text !== "string" || text.length === 0) {
    return result;
  }

  // --- Amount ---
  const amountMatch = AMOUNT_RE.exec(text);
  if (amountMatch) {
    const raw = amountMatch[1].replace(/,/g, "");
    try {
      const paise = toPaise(raw);
      if (Number.isFinite(paise)) {
        result.amountPaise = paise;
      }
    } catch {
      // Leave amountPaise null if conversion fails.
    }
  }

  // --- kind --- (debit takes precedence when both appear, e.g.
  // "debited ... and credited to MERCHANT")
  if (DEBIT_RE.test(text)) {
    result.kind = "debit";
  } else if (CREDIT_RE.test(text)) {
    result.kind = "credit";
  }

  // --- merchant ---
  const merchantMatch = MERCHANT_RE.exec(text);
  if (merchantMatch) {
    const candidate = merchantMatch[1].trim();
    if (candidate.length > 0 && !GENERIC_DEST_RE.test(candidate)) {
      result.merchant = candidate;
    }
  }

  return result;
}

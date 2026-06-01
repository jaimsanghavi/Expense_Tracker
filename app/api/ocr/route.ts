import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OCR service not configured" },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only image files (JPG, PNG, WebP, HEIC) are supported for OCR" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File must be under 5MB" },
      { status: 400 }
    );
  }

  // Fetch user's categories for matching
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("is_archived", false);

  const { data: paymentMethods } = await supabase
    .from("payment_methods")
    .select("id, name, type")
    .eq("user_id", user.id)
    .eq("is_archived", false);

  const categoryNames = (categories ?? []).map((c) => c.name);
  const paymentMethodNames = (paymentMethods ?? []).map((pm) => pm.name);

  // Convert file to base64
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are a receipt OCR assistant. Analyze this receipt image and extract the following information.

Return a JSON object with these fields:
- "amount": the total amount as a number (in INR / Indian Rupees if identifiable, otherwise the main currency shown). Use the final/grand total, not subtotals. Just the number, no currency symbols.
- "merchant": the store/merchant/restaurant name as a string, or null if not identifiable
- "date": the date of the transaction in "YYYY-MM-DD" format, or null if not visible
- "time": the time in "HH:MM" (24-hour) format, or null if not visible
- "note": a brief 1-line description of what was purchased (e.g. "Groceries - rice, dal, vegetables"), or null
- "category_guess": which of these categories best fits: [${categoryNames.map((n) => `"${n}"`).join(", ")}]. Return the exact category name string, or null if none fit.
- "payment_method_guess": which of these payment methods was likely used based on the receipt: [${paymentMethodNames.map((n) => `"${n}"`).join(", ")}]. Return the exact name string, or null if unclear.
- "items": an array of the individual line items on the receipt, each as an object { "name": string, "amount": number } where "name" is the item description and "amount" is that line's total price as a number (no currency symbols, same currency convention as "amount" above; include quantity in the price if the line is for multiple units). Omit tax/discount/total/subtotal summary lines. Return an empty array [] if no line items are identifiable.
- "confidence": a number 0-100 indicating your overall confidence in the extraction

IMPORTANT: Return ONLY the JSON object, no markdown formatting, no code blocks, no explanation.`;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: file.type,
          data: base64,
        },
      },
    ]);

    const text = result.response.text().trim();

    // Strip markdown code fences if present
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    // Map category/payment method guesses to IDs
    let categoryId: string | null = null;
    if (parsed.category_guess && categories) {
      const match = categories.find(
        (c) => c.name.toLowerCase() === parsed.category_guess.toLowerCase()
      );
      if (match) categoryId = match.id;
    }

    let paymentMethodId: string | null = null;
    if (parsed.payment_method_guess && paymentMethods) {
      const match = paymentMethods.find(
        (pm) =>
          pm.name.toLowerCase() === parsed.payment_method_guess.toLowerCase()
      );
      if (match) paymentMethodId = match.id;
    }

    // Defensively normalize line items: keep only entries with a usable
    // numeric amount, and return amounts as strings (same convention as
    // `amount`). If Gemini omits or malforms `items`, fall back to [].
    const items = Array.isArray(parsed.items)
      ? parsed.items
          .map((item: unknown) => {
            const obj = (item ?? {}) as { name?: unknown; amount?: unknown };
            const amountNum = Number(obj.amount);
            if (!Number.isFinite(amountNum)) return null;
            const name =
              typeof obj.name === "string" && obj.name.trim()
                ? obj.name.trim()
                : "Item";
            return { name, amount: String(amountNum) };
          })
          .filter(
            (item: { name: string; amount: string } | null): item is {
              name: string;
              amount: string;
            } => item !== null
          )
      : [];

    return NextResponse.json({
      amount: parsed.amount ? String(parsed.amount) : null,
      merchant: parsed.merchant ?? null,
      date: parsed.date ?? null,
      time: parsed.time ?? null,
      note: parsed.note ?? null,
      categoryId,
      paymentMethodId,
      items,
      confidence: parsed.confidence ?? 0,
    });
  } catch (e: unknown) {
    console.error("OCR error:", e);

    // Handle rate limiting
    const err = e as { status?: number; message?: string };
    if (err.status === 429) {
      return NextResponse.json(
        { error: "Rate limited — please wait a minute and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process receipt. Please fill in details manually." },
      { status: 500 }
    );
  }
}

import { z } from "zod";

// ─── Category ───────────────────────────────────────────────
export const categorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});
export type CategoryInput = z.infer<typeof categorySchema>;

// ─── Payment Method ─────────────────────────────────────────
export const paymentMethodTypeEnum = z.enum([
  "upi",
  "credit_card",
  "debit_card",
  "cash",
  "net_banking",
  "wallet",
  "other",
]);
export type PaymentMethodType = z.infer<typeof paymentMethodTypeEnum>;

export const paymentMethodSchema = z.object({
  name: z.string().min(1).max(100),
  type: paymentMethodTypeEnum,
  provider: z.string().max(100).optional(),
  last_four: z
    .string()
    .regex(/^[0-9]{4}$/)
    .optional()
    .nullable(),
});
export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;

// ─── Friend ─────────────────────────────────────────────────
export const friendSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  upi_handle: z.string().max(100).optional().nullable(),
});
export type FriendInput = z.infer<typeof friendSchema>;

// ─── Expense Share ──────────────────────────────────────────
export const expenseShareSchema = z.object({
  friend_id: z.string().uuid(),
  share_paise: z.number().int().positive(),
});

// ─── Expense ────────────────────────────────────────────────
export const expenseSchema = z.object({
  amount_paise: z.number().int().positive(),
  spent_at: z.string().datetime(),
  category_id: z.string().uuid().nullable(),
  payment_method_id: z.string().uuid().nullable(),
  merchant: z.string().max(200).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  is_split: z.boolean().default(false),
  paid_by: z.string().uuid().optional().nullable(), // friend who paid, null = user paid
  shares: z.array(expenseShareSchema).optional(),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

// ─── Settlement ─────────────────────────────────────────────
export const settlementSchema = z.object({
  friend_id: z.string().uuid(),
  amount_paise: z.number().int().positive(),
  direction: z.enum(["from_friend", "to_friend"]),
  method: paymentMethodTypeEnum.optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  settled_at: z.string().datetime().optional(),
});
export type SettlementInput = z.infer<typeof settlementSchema>;

import { z } from "zod";

export const EXPENSE_CATEGORIES = [
  "SALARIES",
  "MEALS",
  "RENT",
  "TRANSPORT",
  "UTILITIES",
  "MAINTENANCE",
  "MISCELLANEOUS",
] as const;

export const PAYMENT_METHODS = ["CASH", "BANK"] as const;

export const expenseSchema = z.object({
  date: z.string().min(1, "Date is required"),
  branchId: z.string().min(1, "Branch is required"),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  paymentMethod: z.enum(PAYMENT_METHODS),
  receiptReference: z.string().optional(),
  // Only used when category === "RENT" — number of months the payment covers
  coverageMonths: z.number().int().positive().optional(),
});

export const updateExpenseSchema = expenseSchema.partial();
export type ExpenseInput = z.infer<typeof expenseSchema>;

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
  coverageMonths: z.number().int().positive().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
});

export const updateExpenseSchema = expenseSchema.partial();

export type ExpenseInput = z.infer<typeof expenseSchema>;

export const expenseLineSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  id: z.string().optional(),
});

export const bulkExpenseSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
  paymentMethod: z.enum(PAYMENT_METHODS),
  receiptReference: z.string().optional(),
  coverageMonths: z.number().int().positive().optional(),
  expenses: z.array(expenseLineSchema).min(1, "At least one expense is required"),
});

export const bulkExpenseUpdateSchema = z.object({
  expenses: z.array(
    expenseLineSchema.extend({
      id: z.string().min(1, "ID is required for updates"),
    })
  ).min(1, "At least one expense is required"),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
});

export type BulkExpenseInput = z.infer<typeof bulkExpenseSchema>;
export type BulkExpenseUpdateInput = z.infer<typeof bulkExpenseUpdateSchema>;
export type ExpenseLine = z.infer<typeof expenseLineSchema>;

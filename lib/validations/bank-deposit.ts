import { z } from "zod";

export const bankDepositSchema = z.object({
  date: z.string().min(1, "Date is required"),
  branchId: z.string().min(1, "Branch is required"),
  amount: z.number().positive("Amount must be positive"),
  bankName: z.string().min(1, "Bank name is required"),
  referenceNumber: z.string().min(1, "Reference number is required"),
  hasDiscrepancy: z.boolean(),
  discrepancyNote: z.string().nullish(),
});

export const updateBankDepositSchema = bankDepositSchema.partial();
export type BankDepositInput = z.infer<typeof bankDepositSchema>;

import { z } from "zod";

export const advanceSchema = z.object({
  recipientType: z.enum(["SUPPLIER", "OWNER"]),
  amount: z.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date is required"),
  purpose: z.string().min(1, "Purpose is required"),
  supplierId: z.string().optional(),
  ownerId: z.string().optional(),
  branchId: z.string().optional(),
});

export type AdvanceInput = z.infer<typeof advanceSchema>;

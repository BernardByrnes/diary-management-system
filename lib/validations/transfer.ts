import { z } from "zod";

export const transferSchema = z.object({
  date: z.string().min(1, "Date is required"),
  liters: z.number().positive("Liters must be positive"),
  costPerLiter: z.number().positive("Cost per liter must be positive"),
  reason: z.string().min(1, "Reason is required"),
  sourceBranchId: z.string().min(1, "Source branch is required"),
  destinationBranchId: z.string().min(1, "Destination branch is required"),
});

export const updateTransferSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export type TransferInput = z.infer<typeof transferSchema>;
export type UpdateTransferInput = z.infer<typeof updateTransferSchema>;

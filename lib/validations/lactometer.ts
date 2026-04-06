import { z } from "zod";

export const lactometerSchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  branchId: z.string().min(1, "Branch is required"),
  readingValue: z.number().positive("Reading must be positive"),
  notes: z.string().optional(),
});

export const updateLactometerSchema = lactometerSchema.partial();
export type LactometerInput = z.infer<typeof lactometerSchema>;

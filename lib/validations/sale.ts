import { z } from "zod";

export const saleSchema = z.object({
  date: z.string().min(1, "Date is required"),
  branchId: z.string().min(1, "Branch is required"),
  litersSold: z.number().positive("Liters must be positive"),
  pricePerLiter: z.number().positive("Price must be positive"),
});

export const updateSaleSchema = saleSchema.partial();
export type SaleInput = z.infer<typeof saleSchema>;

import { z } from "zod";

export const milkSupplySchema = z.object({
  date: z.string().min(1, "Date is required"),
  branchId: z.string().min(1, "Branch is required"),
  supplierId: z.string().min(1, "Supplier is required"),
  liters: z.number().positive("Liters must be positive"),
  costPerLiter: z.number().positive("Cost per liter must be positive"),
  /** Retail price for this delivery; used as the default when recording sales from this batch. */
  retailPricePerLiter: z
    .number({ error: "Retail price per liter is required" })
    .positive("Retail price per liter must be positive"),
  /** Optional supplier delivery note / GRN reference number. */
  deliveryReference: z.string().optional(),
});

export const updateMilkSupplySchema = milkSupplySchema.partial();
export type MilkSupplyInput = z.infer<typeof milkSupplySchema>;

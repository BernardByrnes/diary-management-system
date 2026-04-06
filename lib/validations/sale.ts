import { z } from "zod";

const optionalSupplyId = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.string().cuid().optional()
);

export const saleSchema = z.object({
  date: z.string().min(1, "Date is required"),
  branchId: z.string().min(1, "Branch is required"),
  litersSold: z.number().positive("Liters must be positive"),
  pricePerLiter: z.number().positive("Price must be positive"),
  /** Optional link to the milk delivery this sale is priced from (same branch). */
  milkSupplyId: optionalSupplyId,
});

export const updateSaleSchema = saleSchema.partial().extend({
  milkSupplyId: z
    .preprocess(
      (val) =>
        val === "" || val === undefined ? undefined : val === null ? null : val,
      z.union([z.string().cuid(), z.null()]).optional()
    ),
});
export type SaleInput = z.infer<typeof saleSchema>;

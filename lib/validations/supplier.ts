import { z } from "zod";

const phoneRegex = /^[0-9+\s-]{7,15}$/;

export const supplierSchema = z.object({
  name: z.string().min(2, "Supplier name must be at least 2 characters"),
  phone: z.string().regex(phoneRegex, "Enter a valid phone number"),
  location: z.string().optional(),
});

export const updateSupplierSchema = supplierSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

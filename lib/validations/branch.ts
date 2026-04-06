import { z } from "zod";

export const branchSchema = z.object({
  name: z.string().min(2, "Branch name must be at least 2 characters"),
  location: z.string().min(2, "Location is required"),
  ownerId: z.string().min(1, "Owner is required"),
  managerIds: z.array(z.string()).optional(),
  /** null = use organisation default rent cycle */
  rentCycle: z.enum(["ANNUAL", "BI_ANNUAL"]).nullable().optional(),
});

export const updateBranchSchema = branchSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type BranchInput = z.infer<typeof branchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;

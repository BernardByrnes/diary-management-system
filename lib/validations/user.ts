import { z } from "zod";

const phoneRegex = /^[0-9+\s-]{7,15}$/;

export const createUserSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().regex(phoneRegex, "Enter a valid phone number"),
  role: z.enum(["EXECUTIVE_DIRECTOR", "MANAGER", "OWNER"]),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").optional(),
  phone: z.string().regex(phoneRegex, "Enter a valid phone number").optional(),
  role: z.enum(["EXECUTIVE_DIRECTOR", "MANAGER", "OWNER"]).optional(),
  isActive: z.boolean().optional(),
  resetPassword: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

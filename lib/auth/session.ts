import { auth } from "@/lib/auth/auth";
import type { Role } from "@prisma/client";

export async function getSession() {
  return await auth();
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireRole(allowedRoles: Role[]) {
  const session = await requireAuth();
  const role = (session.user as { role: Role }).role;
  if (!allowedRoles.includes(role)) {
    throw new Error("Forbidden");
  }
  return session;
}

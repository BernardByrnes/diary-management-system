import { vi } from "vitest";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

// vi.mocked(auth) picks up the NextMiddleware overload from NextAuth v5's
// complex type signature. Cast to the session-returning overload we actually use.
const mockedAuth = vi.mocked(auth) as unknown as {
  mockResolvedValue: (
    value: { user: Record<string, unknown>; expires: string } | null
  ) => void;
};

/**
 * Configures the mocked `auth()` used by API routes (see vitest-setup.ts).
 * `getActiveUserOrError` still runs a live DB check for `isActive`.
 */
export async function setMockAuthUserId(userId: string | null): Promise<void> {
  if (userId === null) {
    mockedAuth.mockResolvedValue(null);
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error(`User ${userId} not found`);
  mockedAuth.mockResolvedValue({
    user: {
      id: user.id,
      name: user.fullName,
      email: user.phone,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
    expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  });
}

export type SeedRole = "ED" | "MANAGER" | "OWNER";

const SEED = {
  ED_PHONE: "0700000001",
  ED_PASSWORD: "Admin@1234",
  MANAGER_PHONE: "0700000004",
  MANAGER_PASSWORD: "Temp@1234",
  OWNER_PHONE: "0700000002",
  OWNER_PASSWORD: "Temp@1234",
} as const;

/** Resolves seed user id by role (requires db:seed). */
export async function seedUserId(role: SeedRole): Promise<string> {
  const phone =
    role === "ED"
      ? SEED.ED_PHONE
      : role === "MANAGER"
        ? SEED.MANAGER_PHONE
        : SEED.OWNER_PHONE;
  const u = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, role: true },
  });
  if (!u) {
    throw new Error(
      `Seed user (${role}) not found for phone ${phone}. Run: npm run db:seed`
    );
  }
  return u.id;
}

export async function seedCredentials(role: SeedRole): Promise<{
  phone: string;
  password: string;
  userId: string;
  dbRole: Role;
}> {
  const phone =
    role === "ED"
      ? SEED.ED_PHONE
      : role === "MANAGER"
        ? SEED.MANAGER_PHONE
        : SEED.OWNER_PHONE;
  const password =
    role === "ED" ? SEED.ED_PASSWORD : role === "MANAGER" ? SEED.MANAGER_PASSWORD : SEED.OWNER_PASSWORD;
  const u = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, role: true },
  });
  if (!u) {
    throw new Error(`Seed user not found for ${phone}. Run: npm run db:seed`);
  }
  return { phone, password, userId: u.id, dbRole: u.role };
}

/** Optional: deactivate a user for auth tests; pair with `cleanup` to reactivate. */
export async function deactivateUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });
}

export async function activateUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: true },
  });
}

/** Looks up branch id by unique name from seed (e.g. "Bwera Nyendo"). */
export async function branchIdByName(name: string): Promise<string> {
  const b = await prisma.branch.findUnique({
    where: { name },
    select: { id: true },
  });
  if (!b) throw new Error(`Branch "${name}" not found. Run: npm run db:seed`);
  return b.id;
}

export async function firstSupplierId(): Promise<string> {
  const s = await prisma.supplier.findFirst({ select: { id: true } });
  if (!s) throw new Error("No supplier in DB. Run: npm run db:seed");
  return s.id;
}

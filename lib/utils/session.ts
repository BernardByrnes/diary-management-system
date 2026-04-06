import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import type { Role } from "@prisma/client";
import { NextResponse } from "next/server";

export type ActiveApiUser = { id: string; role: Role; fullName: string };

/**
 * Validates the current session AND checks that the user is still active in the DB.
 * Returns the session user on success, or a 401/403 NextResponse on failure.
 */
export async function requireActiveSession() {
  const session = await auth();
  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
      user: null,
    };
  }

  const userId = (session.user as { id: string }).id;

  // Live DB check — catches users deactivated mid-session
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true, role: true, fullName: true },
  });

  if (!dbUser || !dbUser.isActive) {
    return {
      error: NextResponse.json(
        { error: "Your account has been deactivated. Please contact the administrator." },
        { status: 403 }
      ),
      user: null,
    };
  }

  return { error: null, user: dbUser };
}

/** Use in API routes instead of `auth()` so deactivated users cannot keep using a stale JWT. */
export async function getActiveUserOrError(): Promise<
  { user: ActiveApiUser; error: null } | { user: null; error: NextResponse }
> {
  const r = await requireActiveSession();
  if (r.error) return { user: null, error: r.error };
  const u = r.user!;
  return {
    user: { id: u.id, role: u.role, fullName: u.fullName },
    error: null,
  };
}

export async function requireRole(allowedRoles: string[]) {
  const { error, user } = await requireActiveSession();
  if (error) return { error, user: null };
  if (!allowedRoles.includes(user!.role)) {
    return {
      error: NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 }),
      user: null,
    };
  }
  return { error: null, user: user! };
}

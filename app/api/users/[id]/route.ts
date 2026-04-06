import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { updateUserSchema } from "@/lib/validations/user";
import { createAuditLog } from "@/lib/utils/audit";
import { generateTempPassword } from "@/lib/utils/password";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user: authUser, error } = await getActiveUserOrError();
  if (error) return error;

  const sessionRole = authUser.role;
  if (sessionRole !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { resetPassword, ...updateData } = parsed.data;

  // Deactivation guard for managers: auto-remove from branch assignments
  if (updateData.isActive === false) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (user?.role === "MANAGER") {
      // Remove from all branch assignments (historical data is preserved)
      await prisma.branchManager.deleteMany({ where: { managerId: id } });
    }
  }

  let tempPassword: string | undefined;

  if (resetPassword) {
    tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    (updateData as Record<string, unknown>).password = hashedPassword;
    (updateData as Record<string, unknown>).mustChangePassword = true;
  }

  if (updateData.phone) {
    const existing = await prisma.user.findFirst({
      where: { phone: updateData.phone, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this phone number already exists" },
        { status: 409 }
      );
    }
  }

  await prisma.user.update({
    where: { id },
    data: updateData,
  });

  await createAuditLog({
    action: "UPDATE",
    entityType: "User",
    entityId: id,
    userId: authUser.id,
    changes: { ...updateData, resetPassword } as Record<string, unknown>,
  });

  return NextResponse.json({ success: true, tempPassword });
}

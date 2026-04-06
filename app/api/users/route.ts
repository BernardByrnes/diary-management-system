import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { createUserSchema } from "@/lib/validations/user";
import { createAuditLog } from "@/lib/utils/audit";
import { generateTempPassword } from "@/lib/utils/password";

export async function GET() {
  const { user: authUser, error } = await getActiveUserOrError();
  if (error) return error;

  const role = authUser.role;
  if (role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      phone: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const { user: authUser, error } = await getActiveUserOrError();
  if (error) return error;

  const role = authUser.role;
  if (role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { fullName, phone, role: userRole } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return NextResponse.json(
      { error: "A user with this phone number already exists" },
      { status: 409 }
    );
  }

  const tempPassword = generateTempPassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: {
      fullName,
      phone,
      role: userRole,
      password: hashedPassword,
      mustChangePassword: true,
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });

  await createAuditLog({
    action: "CREATE",
    entityType: "User",
    entityId: user.id,
    userId: authUser.id,
    changes: { fullName, phone, role: userRole },
  });

  return NextResponse.json({ user, tempPassword }, { status: 201 });
}

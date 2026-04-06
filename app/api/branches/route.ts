import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { branchSchema } from "@/lib/validations/branch";
import { createAuditLog } from "@/lib/utils/audit";

export async function GET() {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  let branchWhere: Record<string, unknown> = {};
  if (user.role === "MANAGER") {
    const managed = await prisma.branchManager.findMany({
      where: { managerId: user.id },
      select: { branchId: true },
    });
    branchWhere = { id: { in: managed.map((b) => b.branchId) } };
  } else if (user.role === "OWNER") {
    branchWhere = { ownerId: user.id };
  }

  const branches = await prisma.branch.findMany({
    where: branchWhere,
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, fullName: true, phone: true } },
      managers: {
        include: { manager: { select: { id: true, fullName: true } } },
      },
    },
  });

  return NextResponse.json(branches);
}

export async function POST(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  const role = user.role;
  if (role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = branchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { name, location, ownerId, managerIds, rentCycle } = parsed.data;

  let branch;
  try {
    branch = await prisma.branch.create({
      data: {
        name,
        location,
        ownerId,
        rentCycle: rentCycle ?? null,
        ...(managerIds && managerIds.length > 0
          ? {
              managers: {
                create: managerIds.map((managerId) => ({ managerId })),
              },
            }
          : {}),
      },
      include: {
        owner: { select: { id: true, fullName: true, phone: true } },
        managers: { include: { manager: { select: { id: true, fullName: true } } } },
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "A branch with this name already exists" },
        { status: 400 }
      );
    }
    throw e;
  }

  await createAuditLog({
    action: "CREATE",
    entityType: "Branch",
    entityId: branch.id,
    userId: user.id,
    changes: { name, location, ownerId, rentCycle },
  });

  return NextResponse.json(
    { ...branch, createdAt: branch.createdAt.toISOString() },
    { status: 201 }
  );
}

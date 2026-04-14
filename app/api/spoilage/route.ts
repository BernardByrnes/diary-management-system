import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import { createNotification } from "@/lib/utils/notifications";

const spoilageSchema = z.object({
  date: z.string().min(1, "Date is required"),
  branchId: z.string().min(1, "Branch is required"),
  liters: z.number().positive("Liters must be positive"),
  reason: z.string().min(1, "Reason is required"),
});

export async function GET() {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  let where: Record<string, unknown> = {};
  if (user.role === "MANAGER") {
    const managed = await prisma.branchManager.findMany({
      where: { managerId: user.id },
      select: { branchId: true },
    });
    where = { branchId: { in: managed.map((b) => b.branchId) } };
  } else if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const records = await prisma.milkSpoilage.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      branch: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, fullName: true } },
      reviewedBy: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json(records);
}

export async function POST(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "MANAGER" && user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = spoilageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { date, branchId, liters, reason } = parsed.data;

  // MANAGER: verify branch assignment
  if (user.role === "MANAGER") {
    const managed = await prisma.branchManager.findFirst({
      where: { managerId: user.id, branchId },
    });
    if (!managed) {
      return NextResponse.json({ error: "You are not assigned to this branch." }, { status: 403 });
    }
  }

  const spoilage = await prisma.milkSpoilage.create({
    data: {
      date: new Date(date),
      branchId,
      liters,
      reason,
      reportedById: user.id,
      status: user.role === "EXECUTIVE_DIRECTOR" ? "APPROVED" : "PENDING",
      ...(user.role === "EXECUTIVE_DIRECTOR" ? { reviewedById: user.id, reviewedAt: new Date() } : {}),
    },
    include: {
      branch: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, fullName: true } },
      reviewedBy: { select: { id: true, fullName: true } },
    },
  });

  // Notify ED when manager reports spoilage
  if (user.role === "MANAGER") {
    const ed = await prisma.user.findFirst({
      where: { role: "EXECUTIVE_DIRECTOR", isActive: true },
      select: { id: true },
    });
    if (ed) {
      await createNotification({
        type: "SPOILAGE_PENDING",
        title: "Milk Spoilage Reported",
        message: `${spoilage.branch.name} reported ${liters}L of spoilage on ${new Date(date).toLocaleDateString()}. Reason: ${reason}`,
        urgency: "HIGH",
        userId: ed.id,
        relatedEntityType: "spoilage",
        relatedEntityId: spoilage.id,
      });
    }
  }

  await createAuditLog({
    action: "CREATE",
    entityType: "MilkSpoilage",
    entityId: spoilage.id,
    userId: user.id,
    changes: { date, branchId, liters, reason },
  });

  return NextResponse.json(spoilage, { status: 201 });
}

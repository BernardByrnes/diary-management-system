import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { updateMilkSupplySchema } from "@/lib/validations/milk-supply";
import { createAuditLog } from "@/lib/utils/audit";
import { getActiveUserOrError } from "@/lib/utils/session";

const MANAGER_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (!["EXECUTIVE_DIRECTOR", "MANAGER"].includes(user.role)) {
    return NextResponse.json(
      { error: "Only managers and the Executive Director can edit milk supply records." },
      { status: 403 }
    );
  }

  const { id } = await params;

  const existing = await prisma.milkSupply.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Milk supply record not found." }, { status: 404 });
  }

  if (user.role === "MANAGER") {
    const managed = await prisma.branchManager.findMany({
      where: { managerId: user.id },
      select: { branchId: true },
    });
    const managedIds = managed.map((b) => b.branchId);
    if (!managedIds.includes(existing.branchId)) {
      return NextResponse.json(
        { error: "You can only edit records in your managed branches." },
        { status: 403 }
      );
    }
    const age = Date.now() - existing.createdAt.getTime();
    if (age > MANAGER_EDIT_WINDOW_MS) {
      const createdStr = existing.createdAt.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return NextResponse.json(
        {
          error: `This record was created on ${createdStr} (more than 24 hours ago) and can no longer be edited by managers. Ask the Executive Director to make changes.`,
        },
        { status: 403 }
      );
    }
  }

  const body = await request.json();
  const parsed = updateMilkSupplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const newLiters =
    data.liters !== undefined ? data.liters : Number(existing.liters);
  const newCostPerLiter =
    data.costPerLiter !== undefined
      ? data.costPerLiter
      : Number(existing.costPerLiter);

  const shouldRecalculate =
    data.liters !== undefined || data.costPerLiter !== undefined;
  const totalCost = shouldRecalculate ? newLiters * newCostPerLiter : undefined;

  const updateData: Record<string, unknown> = { ...data };
  if (data.date) updateData.date = new Date(data.date);
  if (totalCost !== undefined) updateData.totalCost = totalCost;

  const milkSupply = await prisma.milkSupply.update({
    where: { id },
    data: updateData,
    include: {
      branch: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
    },
  });

  await createAuditLog({
    action: "UPDATE",
    entityType: "MilkSupply",
    entityId: id,
    userId: user.id,
    changes: { ...data, ...(totalCost !== undefined ? { totalCost } : {}) },
  });

  return NextResponse.json(milkSupply);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json(
      { error: "Only the Executive Director can delete milk supply records." },
      { status: 403 }
    );
  }

  const { id } = await params;

  const existing = await prisma.milkSupply.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Milk supply record not found." }, { status: 404 });
  }

  await prisma.milkSupply.delete({ where: { id } });

  await createAuditLog({
    action: "DELETE",
    entityType: "MilkSupply",
    entityId: id,
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}

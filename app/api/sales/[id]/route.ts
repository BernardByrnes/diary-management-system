import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { updateSaleSchema } from "@/lib/validations/sale";
import { createAuditLog } from "@/lib/utils/audit";
import { getAvailableLitersForSaleEdit } from "@/lib/utils/stock";
import { getFifoStateForBranch } from "@/lib/utils/fifo";
import { getActiveUserOrError } from "@/lib/utils/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (!["EXECUTIVE_DIRECTOR", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.sale.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  if (user.role === "MANAGER") {
    const managed = await prisma.branchManager.findMany({
      where: { managerId: user.id },
      select: { branchId: true },
    });
    const managedIds = managed.map((b) => b.branchId);
    if (!managedIds.includes(existing.branchId)) {
      return NextResponse.json(
        { error: "You can only edit records in your managed branches" },
        { status: 403 }
      );
    }
  }

  const body = await request.json();
  const parsed = updateSaleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const targetBranchId = data.branchId ?? existing.branchId;

  const newLitersSold =
    data.litersSold !== undefined ? data.litersSold : Number(existing.litersSold);

  const available = await getAvailableLitersForSaleEdit(existing.branchId, id);
  if (newLitersSold > available + 1e-6) {
    return NextResponse.json(
      {
        error: `Not enough milk in stock at this branch. Available: ${available.toFixed(1)} L; attempted sale: ${newLitersSold} L.`,
      },
      { status: 400 }
    );
  }
  const newPricePerLiter =
    data.pricePerLiter !== undefined
      ? data.pricePerLiter
      : Number(existing.pricePerLiter);

  const shouldRecalculate =
    data.litersSold !== undefined || data.pricePerLiter !== undefined;
  const revenue = shouldRecalculate
    ? newLitersSold * newPricePerLiter
    : undefined;

  // Re-compute FIFO lot assignment when branch or liters change.
  const branchChanged = data.branchId !== undefined && data.branchId !== existing.branchId;
  const litersChanged = data.litersSold !== undefined;
  let newMilkSupplyId = existing.milkSupplyId;
  if (branchChanged || litersChanged) {
    const fifo = await getFifoStateForBranch(targetBranchId);
    newMilkSupplyId = fifo.milkSupplyId;
  }

  const updateData: Record<string, unknown> = { ...data };
  if (data.date) updateData.date = new Date(data.date);
  if (revenue !== undefined) updateData.revenue = revenue;
  updateData.milkSupplyId = newMilkSupplyId;

  const sale = await prisma.sale.update({
    where: { id },
    data: updateData,
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
      milkSupply: { select: { id: true, date: true } },
    },
  });

  await createAuditLog({
    action: "UPDATE",
    entityType: "Sale",
    entityId: id,
    userId: user.id,
    changes: { ...data, ...(revenue !== undefined ? { revenue } : {}) },
  });

  return NextResponse.json(sale);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.sale.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  await prisma.sale.delete({ where: { id } });

  await createAuditLog({
    action: "DELETE",
    entityType: "Sale",
    entityId: id,
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}

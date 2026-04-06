import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { milkSupplySchema } from "@/lib/validations/milk-supply";
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
    branchWhere = { branchId: { in: managed.map((b) => b.branchId) } };
  } else if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const milkSupplies = await prisma.milkSupply.findMany({
    where: branchWhere,
    include: {
      branch: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { date: "desc" },
    take: 200,
  });

  return NextResponse.json(milkSupplies);
}

export async function POST(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (!["EXECUTIVE_DIRECTOR", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = milkSupplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { date, branchId, supplierId, liters, costPerLiter, retailPricePerLiter, deliveryReference } =
    parsed.data;

  const supplyDate = new Date(date);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (supplyDate > endOfToday) {
    const dateStr = supplyDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return NextResponse.json(
      { error: `${dateStr} is in the future. Milk supply can only be recorded for today or an earlier date.` },
      { status: 400 }
    );
  }

  if (user.role === "MANAGER") {
    const managed = await prisma.branchManager.findMany({
      where: { managerId: user.id },
      select: { branchId: true },
    });
    const managedIds = managed.map((b) => b.branchId);
    if (!managedIds.includes(branchId)) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { name: true },
      });
      const branchName = branch?.name ?? "that branch";
      return NextResponse.json(
        { error: `You are not assigned to manage ${branchName}.` },
        { status: 403 }
      );
    }
  }

  const totalCost = liters * costPerLiter;

  const milkSupply = await prisma.milkSupply.create({
    data: {
      date: new Date(date),
      branchId,
      supplierId,
      liters,
      costPerLiter,
      totalCost,
      retailPricePerLiter,
      deliveryReference: deliveryReference ?? null,
      recordedById: user.id,
    },
    include: {
      branch: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
    },
  });

  await createAuditLog({
    action: "CREATE",
    entityType: "MilkSupply",
    entityId: milkSupply.id,
    userId: user.id,
    changes: {
      date,
      branchId,
      supplierId,
      liters,
      costPerLiter,
      totalCost,
      retailPricePerLiter,
      deliveryReference,
    },
  });

  return NextResponse.json(milkSupply, { status: 201 });
}

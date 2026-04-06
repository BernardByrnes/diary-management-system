import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { saleSchema } from "@/lib/validations/sale";
import { createAuditLog } from "@/lib/utils/audit";
import { getBranchAvailableLiters } from "@/lib/utils/stock";
import { getActiveUserOrError } from "@/lib/utils/session";

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

  const sales = await prisma.sale.findMany({
    where: branchWhere,
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
      milkSupply: { select: { id: true, date: true } },
    },
    orderBy: { date: "desc" },
    take: 200,
  });

  return NextResponse.json(sales);
}

export async function POST(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (!["EXECUTIVE_DIRECTOR", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = saleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { date, branchId, litersSold, pricePerLiter, milkSupplyId } = parsed.data;

  if (milkSupplyId) {
    const supply = await prisma.milkSupply.findUnique({
      where: { id: milkSupplyId },
      select: { branchId: true },
    });
    if (!supply || supply.branchId !== branchId) {
      return NextResponse.json(
        {
          error:
            "The selected delivery batch must belong to the same branch as this sale.",
        },
        { status: 400 }
      );
    }
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

  const available = await getBranchAvailableLiters(branchId);
  if (litersSold > available + 1e-6) {
    return NextResponse.json(
      {
        error: `Not enough milk in stock at this branch. Available: ${available.toFixed(1)} L; attempted sale: ${litersSold} L.`,
      },
      { status: 400 }
    );
  }

  const revenue = litersSold * pricePerLiter;

  const sale = await prisma.sale.create({
    data: {
      date: new Date(date),
      branchId,
      litersSold,
      pricePerLiter,
      revenue,
      milkSupplyId: milkSupplyId ?? null,
      recordedById: user.id,
    },
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
      milkSupply: { select: { id: true, date: true } },
    },
  });

  await createAuditLog({
    action: "CREATE",
    entityType: "Sale",
    entityId: sale.id,
    userId: user.id,
    changes: { date, branchId, litersSold, pricePerLiter, revenue, milkSupplyId },
  });

  return NextResponse.json(sale, { status: 201 });
}

import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const snapshot = await prisma.stockSnapshot.findUnique({
    where: { id },
    select: { branchId: true, date: true, computedLiters: true },
  });
  if (!snapshot) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  const { branchId } = snapshot;

  // Find the latest approved snapshot BEFORE this one — this is the baseline used
  const baseSnapshot = await prisma.stockSnapshot.findFirst({
    where: {
      branchId,
      status: "APPROVED",
      date: { lt: snapshot.date },
    },
    orderBy: { date: "desc" },
    select: {
      id: true,
      date: true,
      physicalLiters: true,
      branch: { select: { name: true } },
    },
  });

  let dateFilter: { gte: Date } | undefined;
  if (baseSnapshot) {
    const nextDay = new Date(baseSnapshot.date);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    nextDay.setUTCHours(0, 0, 0, 0);
    dateFilter = { gte: nextDay };
  }

  const [supplies, transfersIn, transfersOut, sales] = await Promise.all([
    prisma.milkSupply.findMany({
      where: { branchId, ...(dateFilter ? { date: dateFilter } : {}) },
      select: {
        id: true,
        date: true,
        liters: true,
        deliveryReference: true,
        supplier: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.milkTransfer.findMany({
      where: {
        destinationBranchId: branchId,
        status: "APPROVED",
        ...(dateFilter ? { date: dateFilter } : {}),
      },
      select: {
        id: true,
        date: true,
        liters: true,
        sourceBranch: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.milkTransfer.findMany({
      where: {
        sourceBranchId: branchId,
        status: "APPROVED",
        ...(dateFilter ? { date: dateFilter } : {}),
      },
      select: {
        id: true,
        date: true,
        liters: true,
        destinationBranch: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.sale.findMany({
      where: { branchId, ...(dateFilter ? { date: dateFilter } : {}) },
      select: {
        id: true,
        date: true,
        litersSold: true,
        recordedBy: { select: { fullName: true } },
      },
      orderBy: { date: "asc" },
    }),
  ]);

  const baseStock = baseSnapshot ? Number(baseSnapshot.physicalLiters) : 0;
  const totalSupply = supplies.reduce((s, r) => s + Number(r.liters), 0);
  const totalTransferIn = transfersIn.reduce((s, r) => s + Number(r.liters), 0);
  const totalTransferOut = transfersOut.reduce((s, r) => s + Number(r.liters), 0);
  const totalSold = sales.reduce((s, r) => s + Number(r.litersSold), 0);
  const computed = baseStock + totalSupply + totalTransferIn - totalTransferOut - totalSold;

  return NextResponse.json({
    baseSnapshot: baseSnapshot
      ? {
          id: baseSnapshot.id,
          date: baseSnapshot.date.toISOString(),
          physicalLiters: Number(baseSnapshot.physicalLiters),
        }
      : null,
    supplies: supplies.map((r) => ({
      id: r.id,
      date: r.date.toISOString(),
      liters: Number(r.liters),
      supplier: r.supplier.name,
      deliveryReference: r.deliveryReference,
    })),
    transfersIn: transfersIn.map((r) => ({
      id: r.id,
      date: r.date.toISOString(),
      liters: Number(r.liters),
      sourceBranch: r.sourceBranch.name,
    })),
    transfersOut: transfersOut.map((r) => ({
      id: r.id,
      date: r.date.toISOString(),
      liters: Number(r.liters),
      destinationBranch: r.destinationBranch.name,
    })),
    sales: sales.map((r) => ({
      id: r.id,
      date: r.date.toISOString(),
      litersSold: Number(r.litersSold),
      recordedBy: r.recordedBy.fullName,
    })),
    totals: {
      base: baseStock,
      supply: totalSupply,
      transferIn: totalTransferIn,
      transferOut: totalTransferOut,
      sold: totalSold,
      computed,
    },
  });
}

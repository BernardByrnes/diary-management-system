import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId");

  if (!branchId) {
    // Return all distinct periods across all branches
    const batches = await prisma.expense.groupBy({
      by: ["branchId", "periodStart", "periodEnd"],
      _count: { id: true },
      _sum: { amount: true },
      orderBy: [{ periodEnd: "desc" }],
    });

    const branchIds = [...new Set(batches.map((b) => b.branchId))];
    const branches = await prisma.branch.findMany({
      where: { id: { in: branchIds } },
      select: { id: true, name: true },
    });
    const branchMap = new Map(branches.map((b) => [b.id, b.name]));

    const result = batches.map((b) => ({
      branchId: b.branchId,
      branchName: branchMap.get(b.branchId) ?? "Unknown",
      periodStart: b.periodStart,
      periodEnd: b.periodEnd,
      count: b._count.id,
      total: b._sum.amount,
    }));

    return NextResponse.json(result);
  }

  // Return periods for a specific branch
  const batches = await prisma.expense.groupBy({
    by: ["periodStart", "periodEnd"],
    where: { branchId },
    _count: { id: true },
    _sum: { amount: true },
    orderBy: [{ periodEnd: "desc" }],
  });

  const result = batches.map((b) => ({
    branchId,
    periodStart: b.periodStart,
    periodEnd: b.periodEnd,
    count: b._count.id,
    total: b._sum.amount,
  }));

  return NextResponse.json(result);
}
import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/distributions/calculate?branchId=X&ownerId=Y&periodStart=YYYY-MM-DD&periodEnd=YYYY-MM-DD
 *
 * Aggregates real sales, milk costs, expenses, and outstanding owner advances
 * for the given branch + period so the distribution form can be pre-filled.
 */
export async function GET(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId");
  const ownerId = searchParams.get("ownerId");
  const periodStart = searchParams.get("periodStart");
  const periodEnd = searchParams.get("periodEnd");

  if (!branchId || !ownerId || !periodStart || !periodEnd) {
    return NextResponse.json(
      { error: "branchId, ownerId, periodStart, and periodEnd are required" },
      { status: 400 }
    );
  }

  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  end.setHours(23, 59, 59, 999);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid dates. Use YYYY-MM-DD." }, { status: 400 });
  }
  if (start > end) {
    return NextResponse.json({ error: "Period start cannot be after period end." }, { status: 400 });
  }

  const [salesAgg, milkCostsAgg, expensesAgg, ownerAdvances] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { revenue: true },
      where: { branchId, date: { gte: start, lte: end } },
    }),
    prisma.milkSupply.aggregate({
      _sum: { totalCost: true },
      where: { branchId, date: { gte: start, lte: end } },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { branchId, date: { gte: start, lte: end } },
    }),
    prisma.advance.findMany({
      where: {
        ownerId,
        recipientType: "OWNER",
        isDeducted: false,
        date: { lte: end },
      },
      select: { id: true, amount: true, date: true, purpose: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const totalRevenue = Number(salesAgg._sum.revenue ?? 0);
  const totalMilkCosts = Number(milkCostsAgg._sum.totalCost ?? 0);
  const totalExpenses = Number(expensesAgg._sum.amount ?? 0);
  const grossProfit = totalRevenue - totalMilkCosts - totalExpenses;
  const advanceDeductions = ownerAdvances.reduce((sum, a) => sum + Number(a.amount), 0);
  const netPayout = Math.max(0, grossProfit - advanceDeductions);

  return NextResponse.json({
    totalRevenue,
    totalMilkCosts,
    totalExpenses,
    grossProfit,
    advanceDeductions,
    advanceCount: ownerAdvances.length,
    netPayout,
    advances: ownerAdvances.map((a) => ({
      id: a.id,
      amount: Number(a.amount),
      date: a.date.toISOString(),
      purpose: a.purpose,
    })),
  });
}

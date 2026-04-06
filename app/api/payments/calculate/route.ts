import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/payments/calculate?supplierId=X&periodStart=YYYY-MM-DD&periodEnd=YYYY-MM-DD
 *
 * Returns gross milk cost and outstanding advance deductions for a supplier
 * within a period, so the payment form can pre-fill instead of requiring manual entry.
 */
export async function GET(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json(
      { error: "Only the Executive Director can calculate supplier payments." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get("supplierId");
  const periodStart = searchParams.get("periodStart");
  const periodEnd = searchParams.get("periodEnd");

  if (!supplierId || !periodStart || !periodEnd) {
    return NextResponse.json(
      { error: "supplierId, periodStart, and periodEnd are required" },
      { status: 400 }
    );
  }

  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  end.setHours(23, 59, 59, 999);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json(
      { error: "One or both dates are invalid. Use YYYY-MM-DD format (e.g. 2025-03-01)." },
      { status: 400 }
    );
  }
  if (start > end) {
    return NextResponse.json(
      { error: `Period start (${periodStart}) cannot be after period end (${periodEnd}).` },
      { status: 400 }
    );
  }

  const [milkAgg, advances] = await Promise.all([
    prisma.milkSupply.aggregate({
      _sum: { totalCost: true },
      where: {
        supplierId,
        date: { gte: start, lte: end },
      },
    }),
    prisma.advance.findMany({
      where: {
        supplierId,
        recipientType: "SUPPLIER",
        isDeducted: false,
        date: { lte: end },
      },
      select: { id: true, amount: true, date: true, purpose: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const grossAmount = Number(milkAgg._sum.totalCost ?? 0);
  const advanceDeductions = advances.reduce(
    (sum, a) => sum + Number(a.amount),
    0
  );

  return NextResponse.json({
    grossAmount,
    advanceDeductions,
    advanceCount: advances.length,
    advances: advances.map((a) => ({
      id: a.id,
      amount: Number(a.amount),
      date: a.date.toISOString(),
      purpose: a.purpose,
    })),
  });
}

import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import {
  computeDistributionNetPayout,
  computeGrossProfit,
} from "@/lib/utils/profit-distribution";
import { z } from "zod";

const distributionSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  ownerId: z.string().min(1, "Owner is required"),
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
  totalRevenue: z.coerce.number().nonnegative(),
  totalMilkCosts: z.coerce.number().nonnegative(),
  totalExpenses: z.coerce.number().nonnegative(),
  advanceDeductions: z.coerce.number().nonnegative().default(0),
});

export async function GET() {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const distributions = await prisma.profitDistribution.findMany({
    include: {
      branch: { select: { id: true, name: true } },
      owner: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(distributions);
}

export async function POST(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = distributionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const {
    branchId,
    ownerId,
    periodStart,
    periodEnd,
    totalRevenue,
    totalMilkCosts,
    totalExpenses,
    advanceDeductions,
  } = parsed.data;

  const grossProfit = computeGrossProfit(totalRevenue, totalMilkCosts, totalExpenses);
  const netPayout = computeDistributionNetPayout(grossProfit, advanceDeductions);
  const now = new Date();

  const distribution = await prisma.profitDistribution.create({
    data: {
      branchId,
      ownerId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      totalRevenue,
      totalMilkCosts,
      totalExpenses,
      grossProfit,
      advanceDeductions,
      netPayout,
      status: "PAID",
      approvedAt: now,
    },
    include: {
      branch: { select: { id: true, name: true } },
      owner: { select: { id: true, fullName: true } },
    },
  });

  // Settle all outstanding owner advances
  if (advanceDeductions > 0) {
    await prisma.advance.updateMany({
      where: { ownerId, recipientType: "OWNER", isDeducted: false },
      data: { isDeducted: true, deductedAt: now, deductedFromId: distribution.id },
    });
  }

  await createAuditLog({
    action: "CREATE",
    entityType: "ProfitDistribution",
    entityId: distribution.id,
    userId: user.id,
    changes: { branchId, ownerId, totalRevenue, grossProfit, netPayout },
  });

  return NextResponse.json(distribution, { status: 201 });
}

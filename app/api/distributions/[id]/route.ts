import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import {
  computeDistributionNetPayout,
  computeGrossProfit,
} from "@/lib/utils/profit-distribution";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["CALCULATED", "APPROVED", "PAID"]).optional(),
  totalRevenue: z.coerce.number().nonnegative().optional(),
  totalMilkCosts: z.coerce.number().nonnegative().optional(),
  totalExpenses: z.coerce.number().nonnegative().optional(),
  advanceDeductions: z.coerce.number().nonnegative().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.profitDistribution.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Distribution not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { status, totalRevenue, totalMilkCosts, totalExpenses, advanceDeductions } =
    parsed.data;

  const updateData: Record<string, unknown> = {};

  if (status) updateData.status = status;

  // Recalculate grossProfit and netPayout if amounts changed
  const newRevenue =
    totalRevenue !== undefined ? totalRevenue : Number(existing.totalRevenue);
  const newMilkCosts =
    totalMilkCosts !== undefined ? totalMilkCosts : Number(existing.totalMilkCosts);
  const newExpenses =
    totalExpenses !== undefined ? totalExpenses : Number(existing.totalExpenses);
  const newDeductions =
    advanceDeductions !== undefined
      ? advanceDeductions
      : Number(existing.advanceDeductions);

  if (
    totalRevenue !== undefined ||
    totalMilkCosts !== undefined ||
    totalExpenses !== undefined ||
    advanceDeductions !== undefined
  ) {
    if (totalRevenue !== undefined) updateData.totalRevenue = totalRevenue;
    if (totalMilkCosts !== undefined) updateData.totalMilkCosts = totalMilkCosts;
    if (totalExpenses !== undefined) updateData.totalExpenses = totalExpenses;
    if (advanceDeductions !== undefined) updateData.advanceDeductions = advanceDeductions;

    const newGrossProfit = computeGrossProfit(
      newRevenue,
      newMilkCosts,
      newExpenses
    );
    const newNetPayout = computeDistributionNetPayout(
      newGrossProfit,
      newDeductions
    );
    updateData.grossProfit = newGrossProfit;
    updateData.netPayout = newNetPayout;
  }

  if (status === "APPROVED") {
    updateData.approvedAt = new Date();
  }

  const distribution = await prisma.profitDistribution.update({
    where: { id },
    data: updateData,
    include: {
      branch: { select: { id: true, name: true } },
      owner: { select: { id: true, fullName: true } },
    },
  });

  await createAuditLog({
    action: "UPDATE",
    entityType: "ProfitDistribution",
    entityId: id,
    userId: user.id,
    changes: updateData,
  });

  return NextResponse.json(distribution);
}

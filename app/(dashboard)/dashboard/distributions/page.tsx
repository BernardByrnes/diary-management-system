import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { TrendingUp } from "lucide-react";
import DistributionsClient from "@/components/distributions/DistributionsClient";

export const dynamic = "force-dynamic";

export default async function DistributionsPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user as { id: string; role: string };

  if (user.role !== "EXECUTIVE_DIRECTOR") redirect("/dashboard");

  const params = await searchParams;
  const now = new Date();

  // Default to current bimonthly period: 1–15 or 16–end of month
  const bimonthlyStart = now.getDate() <= 15
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : new Date(now.getFullYear(), now.getMonth(), 16);
  const bimonthlyEnd = now.getDate() <= 15
    ? new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59, 999)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const defaultStartStr = bimonthlyStart.toISOString().slice(0, 10);
  const defaultEndStr = bimonthlyEnd.toISOString().slice(0, 10);

  const monthStart = params.startDate
    ? new Date(params.startDate)
    : bimonthlyStart;
  const monthEnd = params.endDate
    ? new Date(new Date(params.endDate).setHours(23, 59, 59, 999))
    : bimonthlyEnd;

  const [distributions, branches, owners, revenueByBranch, milkCostsByBranch, expensesByBranch] =
    await Promise.all([
      prisma.profitDistribution.findMany({
        include: {
          branch: { select: { id: true, name: true } },
          owner: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.branch.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, ownerId: true },
      }),
      prisma.user.findMany({
        where: { isActive: true, role: "OWNER" },
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true },
      }),
      prisma.sale.groupBy({
        by: ["branchId"],
        _sum: { revenue: true },
        where: { date: { gte: monthStart, lte: monthEnd } },
      }),
      prisma.milkSupply.groupBy({
        by: ["branchId"],
        _sum: { totalCost: true },
        where: { date: { gte: monthStart, lte: monthEnd } },
      }),
      prisma.expense.groupBy({
        by: ["branchId"],
        _sum: { amount: true },
        where: { date: { gte: monthStart, lte: monthEnd } },
      }),
    ]);

  const revenueMap: Record<string, number> = {};
  for (const r of revenueByBranch) revenueMap[r.branchId] = Number(r._sum.revenue ?? 0);

  const milkMap: Record<string, number> = {};
  for (const r of milkCostsByBranch) milkMap[r.branchId] = Number(r._sum.totalCost ?? 0);

  const expensesMap: Record<string, number> = {};
  for (const r of expensesByBranch) expensesMap[r.branchId] = Number(r._sum.amount ?? 0);

  const branchSummaries = branches.map((b) => {
    const revenue = revenueMap[b.id] ?? 0;
    const milkCosts = milkMap[b.id] ?? 0;
    const expenses = expensesMap[b.id] ?? 0;
    const profit = revenue - milkCosts - expenses;
    return { id: b.id, name: b.name, revenue, milkCosts, expenses, profit };
  });

  const serialized = distributions.map((d) => ({
    id: d.id,
    periodStart: d.periodStart.toISOString(),
    periodEnd: d.periodEnd.toISOString(),
    totalRevenue: d.totalRevenue.toString(),
    totalMilkCosts: d.totalMilkCosts.toString(),
    totalExpenses: d.totalExpenses.toString(),
    grossProfit: d.grossProfit.toString(),
    advanceDeductions: d.advanceDeductions.toString(),
    netPayout: d.netPayout.toString(),
    status: d.status,
    approvedAt: d.approvedAt ? d.approvedAt.toISOString() : null,
    branch: d.branch,
    owner: d.owner,
    createdAt: d.createdAt.toISOString(),
  }));

  const effectiveStart = params.startDate ?? defaultStartStr;
  const effectiveEnd = params.endDate ?? defaultEndStr;
  const periodLabel = `${new Date(effectiveStart).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(effectiveEnd).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-violet-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit Distributions</h1>
          <p className="text-sm text-gray-400">
            {distributions.length} distribution{distributions.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
      </div>

      <DistributionsClient
        initialRecords={serialized}
        branchOptions={branches}
        ownerOptions={owners}
        branchSummaries={branchSummaries}
        monthLabel={periodLabel}
        startDate={effectiveStart}
        endDate={effectiveEnd}
      />
    </div>
  );
}

import { prisma } from "@/lib/db/prisma";
import type { BranchSummaryReportData } from "@/lib/utils/pdf-document";

export async function loadBranchSummaryReportData(
  branchId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<BranchSummaryReportData> {
  const [branch, settings] = await Promise.all([
    prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        owner: { select: { fullName: true, phone: true } },
        managers: { include: { manager: { select: { fullName: true } } } },
      },
    }),
    prisma.systemSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  if (!branch) {
    throw new Error("Branch not found");
  }

  const dateFilter = { gte: periodStart, lte: periodEnd };
  const lactometerMin = settings?.lactometerMin
    ? Number(settings.lactometerMin)
    : 1.026;

  const [
    rev,
    milkAgg,
    expAgg,
    litersIn,
    litersSold,
    supplierGroups,
    expenseGroups,
    depositsAgg,
    depositCount,
    discCount,
    spoilSum,
    lowReadings,
    transfersOut,
    transfersIn,
    deliveryDetails,
    depositDetails,
    expenseDetails,
  ] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { revenue: true },
      where: { branchId, date: dateFilter },
    }),
    prisma.milkSupply.aggregate({
      _sum: { totalCost: true },
      where: { branchId, date: dateFilter },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { branchId, date: dateFilter },
    }),
    prisma.milkSupply.aggregate({
      _sum: { liters: true },
      where: { branchId, date: dateFilter },
    }),
    prisma.sale.aggregate({
      _sum: { litersSold: true },
      where: { branchId, date: dateFilter },
    }),
    prisma.milkSupply.groupBy({
      by: ["supplierId"],
      where: { branchId, date: dateFilter },
      _sum: { liters: true, totalCost: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { branchId, date: dateFilter },
      _sum: { amount: true },
    }),
    prisma.bankDeposit.aggregate({
      _sum: { amount: true },
      where: { branchId, date: dateFilter },
    }),
    prisma.bankDeposit.count({
      where: { branchId, date: dateFilter },
    }),
    prisma.bankDeposit.count({
      where: { branchId, date: dateFilter, hasDiscrepancy: true },
    }),
    prisma.milkSpoilage.aggregate({
      _sum: { liters: true },
      where: { branchId, date: dateFilter },
    }),
    prisma.lactometerReading.count({
      where: {
        branchId,
        date: dateFilter,
        readingValue: { lt: lactometerMin },
      },
    }),
    prisma.milkTransfer.findMany({
      where: {
        sourceBranchId: branchId,
        date: dateFilter,
      },
      orderBy: { date: "desc" },
      take: 8,
      include: {
        destinationBranch: { select: { name: true } },
      },
    }),
    prisma.milkTransfer.findMany({
      where: {
        destinationBranchId: branchId,
        date: dateFilter,
      },
      orderBy: { date: "desc" },
      take: 8,
      include: {
        sourceBranch: { select: { name: true } },
      },
    }),
    prisma.milkSupply.findMany({
      where: { branchId, date: dateFilter },
      orderBy: { date: "desc" },
      take: 50,
      include: { supplier: { select: { name: true } } },
    }),
    prisma.bankDeposit.findMany({
      where: { branchId, date: dateFilter },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.expense.findMany({
      where: { branchId, date: dateFilter },
      orderBy: { date: "desc" },
      take: 50,
    }),
  ]);

  const supplierIds = supplierGroups.map((g) => g.supplierId);
  const suppliers = await prisma.supplier.findMany({
    where: { id: { in: supplierIds } },
    select: { id: true, name: true },
  });
  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]));

  const suppliersByVolume = supplierGroups
    .map((g) => ({
      name: supplierName.get(g.supplierId) ?? "—",
      liters: Number(g._sum.liters ?? 0),
      cost: Number(g._sum.totalCost ?? 0),
    }))
    .sort((a, b) => b.liters - a.liters);

  const expensesByCategory = expenseGroups
    .map((g) => ({
      category: String(g.category).replace(/_/g, " "),
      amount: Number(g._sum.amount ?? 0),
    }))
    .sort((a, b) => b.amount - a.amount);

  const revenue = Number(rev._sum.revenue ?? 0);
  const milkCost = Number(milkAgg._sum.totalCost ?? 0);
  const expenses = Number(expAgg._sum.amount ?? 0);
  const grossProfit = revenue - milkCost;
  const netProfit = grossProfit - expenses;

  const periodLabel = `${periodStart.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} – ${periodEnd.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;

  return {
    periodLabel,
    branch: {
      name: branch.name,
      location: branch.location,
      isActive: branch.isActive,
    },
    owner: {
      fullName: branch.owner.fullName,
      phone: branch.owner.phone,
    },
    managers: branch.managers.map((m) => ({ fullName: m.manager.fullName })),
    financials: {
      revenue,
      milkCost,
      expenses,
      grossProfit,
      netProfit,
    },
    volumes: {
      milkLitersIn: Number(litersIn._sum.liters ?? 0),
      milkLitersSold: Number(litersSold._sum.litersSold ?? 0),
    },
suppliersByVolume,
  expensesByCategory,
  banking: {
    depositCount,
    totalDeposited: Number(depositsAgg._sum.amount ?? 0),
    discrepancyCount: discCount,
  },
  transfersOutgoing: transfersOut.map((t) => ({
    date: t.date.toISOString(),
    liters: Number(t.liters),
    otherBranch: t.destinationBranch.name,
    status: t.status,
  })),
  transfersIncoming: transfersIn.map((t) => ({
    date: t.date.toISOString(),
    liters: Number(t.liters),
    otherBranch: t.sourceBranch.name,
    status: t.status,
  })),
  operations: {
    spoilageLiters: Number(spoilSum._sum.liters ?? 0),
    lactometerReadingsBelowMin: lowReadings,
  },
  deliveries: deliveryDetails.map((d) => ({
    date: d.date.toISOString(),
    supplierName: d.supplier.name,
    liters: Number(d.liters),
    cost: Number(d.totalCost),
  })),
  deposits: depositDetails.map((d) => ({
    date: d.date.toISOString(),
    amount: Number(d.amount),
    bankName: d.bankName,
    referenceNumber: d.referenceNumber,
    hasDiscrepancy: d.hasDiscrepancy,
    discrepancyNote: d.discrepancyNote,
  })),
  expenses: expenseDetails.map((e) => ({
    date: e.date.toISOString(),
    category: String(e.category).replace(/_/g, " "),
    description: e.description,
    amount: Number(e.amount),
    paymentMethod: String(e.paymentMethod),
  })),
};
}

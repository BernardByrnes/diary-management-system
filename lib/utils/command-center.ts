import { prisma } from "@/lib/db/prisma";
import { getBranchAvailableLiters } from "@/lib/utils/stock";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LossBranch = {
  branchId: string;
  branchName: string;
  loss: number; // negative number
};

export type Discrepancy = {
  branchId: string;
  branchName: string;
  amount: number; // deposit amount involved in the discrepancy
  expectedAmount: number;
  actualAmount: number;
  date: Date;
};

export type UpcomingPayment = {
  paymentId: string;
  supplierId: string;
  supplierName: string;
  amount: number; // netAmount
  scheduledDate: Date;
  daysUntil: number;
};

export type LowStock = {
  branchId: string;
  branchName: string;
  currentStock: number; // in liters
  date: Date;
};

export type Alert = {
  id: string;
  type: "LOSS" | "DISCREPANCY" | "PAYMENT" | "STOCK";
  urgency: "HIGH" | "MEDIUM" | "LOW";
  message: string;
  actionUrl: string;
  metadata?: {
    branchName?: string;
    amount?: number;
    date?: Date;
    count?: number;
  };
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-UG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

// ─── Function 1: Loss-Making Branches ────────────────────────────────────────

export async function getLossMakingBranches(
  periodStart: Date,
  periodEnd: Date
): Promise<LossBranch[]> {
  try {
    // Option A: Use ProfitDistribution records if they exist for the period
    const distributions = await prisma.profitDistribution.findMany({
      where: {
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
        netPayout: { lte: 0 },
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });

    if (distributions.length > 0) {
      return distributions
        .map((d) => ({
          branchId: d.branchId,
          branchName: d.branch.name,
          loss: Number(d.netPayout),
        }))
        .sort((a, b) => a.loss - b.loss); // most negative first
    }

    // Option B: Calculate on-the-fly from raw transactions
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    if (branches.length === 0) return [];

    const [revenueByBranch, costsByBranch, expensesByBranch] = await Promise.all([
      prisma.sale.groupBy({
        by: ["branchId"],
        where: { date: { gte: periodStart, lte: periodEnd } },
        _sum: { revenue: true },
      }),
      prisma.milkSupply.groupBy({
        by: ["branchId"],
        where: { date: { gte: periodStart, lte: periodEnd } },
        _sum: { totalCost: true },
      }),
      prisma.expense.groupBy({
        by: ["branchId"],
        where: { date: { gte: periodStart, lte: periodEnd } },
        _sum: { amount: true },
      }),
    ]);

    const revenueMap = new Map(
      revenueByBranch.map((r) => [r.branchId, Number(r._sum.revenue ?? 0)])
    );
    const costsMap = new Map(
      costsByBranch.map((c) => [c.branchId, Number(c._sum.totalCost ?? 0)])
    );
    const expensesMap = new Map(
      expensesByBranch.map((e) => [e.branchId, Number(e._sum.amount ?? 0)])
    );

    const lossBranches: LossBranch[] = [];
    for (const branch of branches) {
      const revenue = revenueMap.get(branch.id) ?? 0;
      const costs = costsMap.get(branch.id) ?? 0;
      const expenses = expensesMap.get(branch.id) ?? 0;
      const profit = revenue - costs - expenses;
      if (profit <= 0) {
        lossBranches.push({
          branchId: branch.id,
          branchName: branch.name,
          loss: profit,
        });
      }
    }

    return lossBranches.sort((a, b) => a.loss - b.loss);
  } catch (err) {
    console.error("Command Center: getLossMakingBranches failed", err);
    return [];
  }
}

// ─── Function 2: Banking Discrepancies ───────────────────────────────────────

export async function getBankingDiscrepancies(): Promise<Discrepancy[]> {
  try {
    const deposits = await prisma.bankDeposit.findMany({
      where: { hasDiscrepancy: true },
      include: {
        branch: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
      take: 10,
    });

    // Schema tracks that a discrepancy exists but doesn't store expected/actual
    // amounts separately — we surface the deposit amount as context
    return deposits.map((d) => ({
      branchId: d.branchId,
      branchName: d.branch.name,
      amount: Number(d.amount),
      expectedAmount: Number(d.amount),
      actualAmount: Number(d.amount),
      date: d.date,
    }));
  } catch (err) {
    console.error("Command Center: getBankingDiscrepancies failed", err);
    return [];
  }
}

// ─── Function 3: Upcoming Payments ───────────────────────────────────────────

export async function getUpcomingPayments(
  daysAhead: number = 3
): Promise<UpcomingPayment[]> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    const payments = await prisma.supplierPayment.findMany({
      where: {
        scheduledDate: { gte: today, lte: cutoffDate },
        status: { not: "PAID" },
      },
      include: {
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { scheduledDate: "asc" },
      take: 10,
    });

    return payments.map((p) => {
      const dueDate = p.scheduledDate ?? p.periodEnd;
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysUntil = Math.ceil(
        (dueDate.getTime() - today.getTime()) / msPerDay
      );
      return {
        paymentId: p.id,
        supplierId: p.supplierId,
        supplierName: p.supplier.name,
        amount: Number(p.netAmount),
        scheduledDate: dueDate,
        daysUntil,
      };
    });
  } catch (err) {
    console.error("Command Center: getUpcomingPayments failed", err);
    return [];
  }
}

// ─── Function 4: Low Stock Branches ──────────────────────────────────────────

export async function getLowStockBranches(
  thresholdLiters: number = 50
): Promise<LowStock[]> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    if (branches.length === 0) return [];

    // Check all branches in parallel using the existing accurate stock util
    const stockResults = await Promise.all(
      branches.map(async (branch) => ({
        branch,
        currentStock: await getBranchAvailableLiters(branch.id),
      }))
    );

    return stockResults
      .filter((r) => r.currentStock < thresholdLiters)
      .map((r) => ({
        branchId: r.branch.id,
        branchName: r.branch.name,
        currentStock: r.currentStock,
        date: today,
      }));
  } catch (err) {
    console.error("Command Center: getLowStockBranches failed", err);
    return [];
  }
}

// ─── Function 5: Stock Runout Projections ────────────────────────────────────

type StockProjection = {
  branchId: string;
  branchName: string;
  currentStock: number;
  avgDailySales: number;
  daysRemaining: number;
};

async function getStockProjections(
  thresholdDays: number = 3
): Promise<StockProjection[]> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const projections: StockProjection[] = [];

    for (const branch of branches) {
      // Reuse the same accurate stock utility used by getLowStockBranches
      const currentStock = await getBranchAvailableLiters(branch.id);

      // Average daily sales over last 7 days
      const salesLast7Days = await prisma.sale.aggregate({
        where: {
          branchId: branch.id,
          date: { gte: sevenDaysAgo, lt: today },
        },
        _sum: { litersSold: true },
      });

      const totalSales = Number(salesLast7Days._sum.litersSold ?? 0);
      const avgDailySales = totalSales / 7;

      // Skip if no sales (avoid division by zero)
      if (avgDailySales === 0) continue;

      const daysRemaining = currentStock / avgDailySales;

      if (daysRemaining < thresholdDays && daysRemaining >= 0) {
        projections.push({
          branchId: branch.id,
          branchName: branch.name,
          currentStock,
          avgDailySales,
          daysRemaining,
        });
      }
    }

    return projections;
  } catch (err) {
    console.error("Command Center: getStockProjections failed", err);
    return [];
  }
}

// ─── Function 6: Loss Projections ────────────────────────────────────────────

type LossProjection = {
  branchId: string;
  branchName: string;
  monthToDateProfit: number;
  projectedMonthEndProfit: number;
  reason: string;
};

async function getLossProjections(): Promise<LossProjection[]> {
  try {
    const today = new Date();
    const dayOfMonth = today.getDate();

    // Only run projections after the 15th of the month
    if (dayOfMonth < 15) return [];

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const daysInMonth = monthEnd.getDate();

    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const projections: LossProjection[] = [];

    for (const branch of branches) {
      const [revenue, costs, expenses] = await Promise.all([
        prisma.sale.aggregate({
          where: { branchId: branch.id, date: { gte: monthStart, lte: today } },
          _sum: { revenue: true },
        }),
        prisma.milkSupply.aggregate({
          where: { branchId: branch.id, date: { gte: monthStart, lte: today } },
          _sum: { totalCost: true },
        }),
        prisma.expense.aggregate({
          where: { branchId: branch.id, date: { gte: monthStart, lte: today } },
          _sum: { amount: true },
        }),
      ]);

      const mtdRevenue = Number(revenue._sum.revenue ?? 0);
      const mtdCosts = Number(costs._sum.totalCost ?? 0);
      const mtdExpenses = Number(expenses._sum.amount ?? 0);
      const mtdProfit = mtdRevenue - mtdCosts - mtdExpenses;

      const dailyAvgProfit = mtdProfit / dayOfMonth;
      const remainingDays = daysInMonth - dayOfMonth;
      const projectedMonthEndProfit = mtdProfit + dailyAvgProfit * remainingDays;

      if (projectedMonthEndProfit < 0) {
        let reason = "current loss trend";
        const expenseRatio = mtdRevenue > 0 ? mtdExpenses / mtdRevenue : 0;
        if (expenseRatio > 0.8) {
          reason = "high expense ratio";
        } else if (mtdRevenue === 0) {
          reason = "no sales recorded";
        } else if (mtdCosts > mtdRevenue * 0.7) {
          reason = "high milk costs";
        }

        projections.push({
          branchId: branch.id,
          branchName: branch.name,
          monthToDateProfit: mtdProfit,
          projectedMonthEndProfit,
          reason,
        });
      }
    }

    return projections;
  } catch (err) {
    console.error("Command Center: getLossProjections failed", err);
    return [];
  }
}

// ─── Function 7: Generate Command Center Alerts ───────────────────────────────

export async function getCommandCenterAlerts(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<Alert[]> {
  const [losses, discrepancies, payments, lowStock, stockProjections, lossProjections] =
    await Promise.all([
      getLossMakingBranches(periodStart, periodEnd).catch((err) => {
        console.error("Command Center: Loss check failed", err);
        return [] as LossBranch[];
      }),
      getBankingDiscrepancies().catch((err) => {
        console.error("Command Center: Discrepancy check failed", err);
        return [] as Discrepancy[];
      }),
      getUpcomingPayments(3).catch((err) => {
        console.error("Command Center: Payment check failed", err);
        return [] as UpcomingPayment[];
      }),
      getLowStockBranches(50).catch((err) => {
        console.error("Command Center: Stock check failed", err);
        return [] as LowStock[];
      }),
      getStockProjections(3).catch((err) => {
        console.error("Command Center: Stock projection check failed", err);
        return [] as StockProjection[];
      }),
      getLossProjections().catch((err) => {
        console.error("Command Center: Loss projection check failed", err);
        return [] as LossProjection[];
      }),
    ]);

  const alerts: Alert[] = [];

  // LOSS ALERTS
  if (losses.length === 1) {
    alerts.push({
      id: "loss-1",
      type: "LOSS",
      urgency: "HIGH",
      message: `${losses[0].branchName} is operating at a loss this period`,
      actionUrl: "/dashboard/distributions",
      metadata: {
        branchName: losses[0].branchName,
        amount: Math.abs(losses[0].loss),
      },
    });
  } else if (losses.length > 1) {
    const names = losses.map((l) => l.branchName).join(", ");
    alerts.push({
      id: "loss-multi",
      type: "LOSS",
      urgency: "HIGH",
      message: `${losses.length} branches operating at a loss this period: ${names}`,
      actionUrl: "/dashboard/distributions",
      metadata: { count: losses.length },
    });
  }

  // DISCREPANCY ALERTS
  discrepancies.forEach((disc, index) => {
    alerts.push({
      id: `disc-${index}`,
      type: "DISCREPANCY",
      urgency: "HIGH",
      message: `${disc.branchName} has a UGX ${formatMoney(disc.amount)} banking discrepancy on ${formatDate(disc.date)}`,
      actionUrl: "/dashboard/banking",
      metadata: {
        branchName: disc.branchName,
        amount: disc.amount,
        date: disc.date,
      },
    });
  });

  // PAYMENT ALERTS
  if (payments.length === 1) {
    alerts.push({
      id: "payment-1",
      type: "PAYMENT",
      urgency: "MEDIUM",
      message: `Payment to ${payments[0].supplierName} due on ${formatDate(payments[0].scheduledDate)} (UGX ${formatMoney(payments[0].amount)})`,
      actionUrl: "/dashboard/payments",
      metadata: {
        amount: payments[0].amount,
        date: payments[0].scheduledDate,
      },
    });
  } else if (payments.length > 1) {
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const supplierNames = [...new Set(payments.map((p) => p.supplierName))].join(", ");
    alerts.push({
      id: "payment-multi",
      type: "PAYMENT",
      urgency: "MEDIUM",
      message: `${payments.length} supplier payments due within 3 days (${supplierNames}) — total UGX ${formatMoney(totalAmount)}`,
      actionUrl: "/dashboard/payments",
      metadata: { count: payments.length, amount: totalAmount },
    });
  }

  // STOCK ALERTS
  lowStock.forEach((stock, index) => {
    alerts.push({
      id: `stock-${index}`,
      type: "STOCK",
      urgency: "HIGH",
      message: `${stock.branchName} stock critically low (${stock.currentStock.toFixed(1)}L remaining)`,
      actionUrl: "/dashboard/milk-supply",
      metadata: {
        branchName: stock.branchName,
        amount: stock.currentStock,
      },
    });
  });

  // STOCK PROJECTION ALERTS
  stockProjections.forEach((proj, index) => {
    alerts.push({
      id: `stock-proj-${index}`,
      type: "STOCK",
      urgency: "HIGH",
      message: `${proj.branchName} stock will run out in ${Math.ceil(proj.daysRemaining)} day(s) at current sales rate`,
      actionUrl: "/dashboard/milk-supply",
      metadata: {
        branchName: proj.branchName,
        amount: Math.ceil(proj.daysRemaining),
      },
    });
  });

  // LOSS PROJECTION ALERTS
  lossProjections.forEach((proj, index) => {
    alerts.push({
      id: `loss-proj-${index}`,
      type: "LOSS",
      urgency: "MEDIUM",
      message: `${proj.branchName} projected to be loss-making this month (${proj.reason})`,
      actionUrl: "/dashboard/distributions",
      metadata: {
        branchName: proj.branchName,
        amount: Math.abs(proj.projectedMonthEndProfit),
      },
    });
  });

  // Sort by urgency then limit to 10
  const urgencyOrder: Record<string, number> = { HIGH: 1, MEDIUM: 2, LOW: 3 };
  alerts.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return alerts.slice(0, 10);
}

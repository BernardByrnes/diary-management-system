import { prisma } from "@/lib/db/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Insight = {
  type: "REVENUE" | "PROFIT" | "EXPENSE" | "PERFORMANCE";
  icon: string; // lucide-react icon name
  title: string;
  description: string;
  trend?: "UP" | "DOWN" | "STABLE";
  changePercent?: number;
};

export type BranchData = {
  name: string;
  currentRevenue: number;
  previousRevenue: number;
  currentProfit: number;
  previousProfit: number;
};

export type InsightExpenseCategory = {
  name: string;
  currentAmount: number;
  previousAmount: number;
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-UG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Function 1: Revenue Insight ─────────────────────────────────────────────

export function generateRevenueInsight(data: {
  currentRevenue: number;
  previousRevenue: number;
  branches: BranchData[];
}): Insight {
  if (data.previousRevenue === 0) {
    return {
      type: "REVENUE",
      icon: "TrendingUp",
      title: "Revenue data available",
      description: `UGX ${formatMoney(data.currentRevenue)} generated this period.`,
      trend: "STABLE",
    };
  }

  const percentChange =
    ((data.currentRevenue - data.previousRevenue) / data.previousRevenue) *
    100;
  const absChange = Math.abs(percentChange);

  const topBranch =
    data.branches.length > 0
      ? data.branches.reduce((max, branch) =>
          branch.currentRevenue > max.currentRevenue ? branch : max
        )
      : null;

  const branchesWithChange = data.branches.map((branch) => ({
    ...branch,
    change: branch.currentRevenue - branch.previousRevenue,
  }));

  const biggestGainer =
    branchesWithChange.length > 0
      ? branchesWithChange.reduce((max, branch) =>
          branch.change > max.change ? branch : max
        )
      : null;

  const biggestLoser =
    branchesWithChange.length > 0
      ? branchesWithChange.reduce((min, branch) =>
          branch.change < min.change ? branch : min
        )
      : null;

  let title: string;
  let description: string;
  let trend: "UP" | "DOWN" | "STABLE";

  if (percentChange > 2) {
    trend = "UP";
    title = `Revenue increased by ${absChange.toFixed(1)}%`;
    const parts: string[] = ["Compared to the previous period."];
    if (topBranch) {
      parts.push(
        `${topBranch.name} contributed the most (UGX ${formatMoney(topBranch.currentRevenue)}).`
      );
    }
    if (biggestGainer && biggestGainer.change > 0) {
      parts.push(
        `${biggestGainer.name} grew by UGX ${formatMoney(biggestGainer.change)}.`
      );
    }
    description = parts.join(" ");
  } else if (percentChange < -2) {
    trend = "DOWN";
    title = `Revenue decreased by ${absChange.toFixed(1)}%`;
    const parts: string[] = ["Compared to the previous period."];
    if (biggestLoser && biggestLoser.change < 0) {
      parts.push(
        `${biggestLoser.name} dropped by UGX ${formatMoney(Math.abs(biggestLoser.change))}.`
      );
    }
    if (biggestGainer && biggestGainer.change > 0) {
      parts.push(
        `However, ${biggestGainer.name} grew by UGX ${formatMoney(biggestGainer.change)}.`
      );
    }
    description = parts.join(" ");
  } else {
    trend = "STABLE";
    title = "Revenue remained stable";
    description = `No significant change from the previous period (${absChange.toFixed(1)}% variation).`;
  }

  if (data.branches.length === 0) {
    description += " No branch-level breakdown available.";
  }

  return {
    type: "REVENUE",
    icon: "TrendingUp",
    title,
    description,
    trend,
    changePercent: percentChange,
  };
}

// ─── Function 2: Profit Insight ───────────────────────────────────────────────

export function generateProfitInsight(data: {
  currentProfit: number;
  previousProfit: number;
  lossMakingBranches: Array<{ name: string; loss: number; reason: string }>;
}): Insight {
  if (data.previousProfit === 0 && data.currentProfit === 0) {
    return {
      type: "PROFIT",
      icon: "DollarSign",
      title: "No profit data",
      description: "Profit information not available for comparison.",
      trend: "STABLE",
    };
  }

  if (data.currentProfit < 0) {
    const lossAmount = Math.abs(data.currentProfit);
    let description = `Net loss of UGX ${formatMoney(lossAmount)} this period. `;
    if (data.lossMakingBranches.length > 0) {
      const branchNames = data.lossMakingBranches.map((b) => b.name).join(", ");
      description += `Loss-making branches: ${branchNames}. Review expenses and branch performance.`;
    } else {
      description += "Review operational costs and pricing strategy.";
    }
    return {
      type: "PROFIT",
      icon: "AlertCircle",
      title: "Cooperative operating at a loss",
      description,
      trend: "DOWN",
    };
  }

  const percentChange =
    data.previousProfit !== 0
      ? ((data.currentProfit - data.previousProfit) / data.previousProfit) *
        100
      : 100;

  const absChange = Math.abs(percentChange);
  let title: string;
  let description: string;
  let trend: "UP" | "DOWN" | "STABLE";

  if (percentChange > 2) {
    trend = "UP";
    title = `Net profit increased by ${absChange.toFixed(1)}%`;
    if (data.lossMakingBranches.length === 0) {
      description = "Strong performance across all branches.";
    } else {
      const branchCount = data.lossMakingBranches.length;
      description = `Despite ${branchCount} branch${branchCount > 1 ? "es" : ""} operating at a loss, overall profit improved.`;
    }
  } else if (percentChange < -2) {
    trend = "DOWN";
    title = `Net profit decreased by ${absChange.toFixed(1)}%`;
    if (data.lossMakingBranches.length > 0) {
      const branchCount = data.lossMakingBranches.length;
      const branchNames = data.lossMakingBranches
        .slice(0, 2)
        .map((b) => b.name)
        .join(", ");
      const reasons = [
        ...new Set(data.lossMakingBranches.map((b) => b.reason)),
      ].join(", ");
      description = `${branchCount} branch${branchCount > 1 ? "es" : ""} (${branchNames}${branchCount > 2 ? ", ..." : ""}) operating at a loss. Main reasons: ${reasons}.`;
    } else {
      description =
        "Profit margins have compressed. Review pricing and cost structure.";
    }
  } else {
    trend = "STABLE";
    title = "Profit remained stable";
    description = `No significant change from the previous period (${absChange.toFixed(1)}% variation).`;
  }

  return {
    type: "PROFIT",
    icon: "DollarSign",
    title,
    description,
    trend,
    changePercent: percentChange,
  };
}

// ─── Function 3: Expense Insight ─────────────────────────────────────────────

export function generateExpenseInsight(data: {
  currentExpenses: number;
  previousExpenses: number;
  categories: InsightExpenseCategory[];
}): Insight {
  if (data.previousExpenses === 0) {
    return {
      type: "EXPENSE",
      icon: "Receipt",
      title: "Expense tracking started",
      description: `UGX ${formatMoney(data.currentExpenses)} in expenses recorded this period.`,
      trend: "STABLE",
    };
  }

  const percentChange =
    ((data.currentExpenses - data.previousExpenses) / data.previousExpenses) *
    100;
  const absChange = Math.abs(percentChange);

  const categoriesWithChange = data.categories.map((cat) => ({
    ...cat,
    change: cat.currentAmount - cat.previousAmount,
  }));

  const biggestIncrease =
    categoriesWithChange.length > 0
      ? categoriesWithChange.reduce((max, cat) =>
          cat.change > max.change ? cat : max
        )
      : null;

  let title: string;
  let description: string;
  let trend: "UP" | "DOWN" | "STABLE";

  if (percentChange > 2) {
    trend = "UP";
    title = `Expenses increased by ${absChange.toFixed(1)}%`;
    if (biggestIncrease && biggestIncrease.change > 0) {
      description = `Compared to the previous period. ${biggestIncrease.name} costs rose by UGX ${formatMoney(biggestIncrease.change)}, the largest increase.`;
    } else {
      description =
        "Compared to the previous period. Review cost categories for optimization opportunities.";
    }
  } else if (percentChange < -2) {
    trend = "DOWN";
    title = `Expenses decreased by ${absChange.toFixed(1)}%`;
    description = "Good cost control across categories. Maintain efficiency.";
  } else {
    trend = "STABLE";
    title = "Expenses remained stable";
    description = `No significant change from the previous period (${absChange.toFixed(1)}% variation).`;
  }

  return {
    type: "EXPENSE",
    icon: "Receipt",
    title,
    description,
    trend,
    changePercent: percentChange,
  };
}

// ─── Function 4: Top Performer Insight ───────────────────────────────────────

export function generateTopPerformerInsight(
  branches: Array<{
    name: string;
    profit: number;
    profitShare: number;
  }>
): Insight {
  if (branches.length === 0) {
    return {
      type: "PERFORMANCE",
      icon: "Award",
      title: "No branch data available",
      description: "Branch performance data not available for this period.",
      trend: "STABLE",
    };
  }

  const sortedBranches = [...branches].sort((a, b) => b.profit - a.profit);
  const topBranch = sortedBranches[0];

  if (topBranch.profit <= 0) {
    return {
      type: "PERFORMANCE",
      icon: "AlertCircle",
      title: "No profitable branches this period",
      description:
        "All branches recorded losses or break-even. Review operational costs and pricing across the cooperative.",
      trend: "DOWN",
    };
  }

  return {
    type: "PERFORMANCE",
    icon: "Award",
    title: `${topBranch.name} is the top performer`,
    description: `Contributing UGX ${formatMoney(topBranch.profit)} in profit (${topBranch.profitShare.toFixed(1)}% of total cooperative profit).`,
    trend: "UP",
  };
}

// ─── Function 5: Orchestrator ─────────────────────────────────────────────────

export async function getDashboardInsights(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<Insight[]> {
  try {
    // Calculate previous period (same length, immediately before)
    const periodLength = periodEnd.getTime() - periodStart.getTime();
    const previousPeriodEnd = new Date(periodStart.getTime() - 1);
    const previousPeriodStart = new Date(
      previousPeriodEnd.getTime() - periodLength
    );

    // Fetch current and previous period data in parallel
    const [
      currentSales,
      currentSupplies,
      currentExpenses,
      previousSales,
      previousSupplies,
      previousExpenses,
      branches,
    ] = await Promise.all([
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
        by: ["branchId", "category"],
        where: { date: { gte: periodStart, lte: periodEnd } },
        _sum: { amount: true },
      }),
      prisma.sale.groupBy({
        by: ["branchId"],
        where: { date: { gte: previousPeriodStart, lte: previousPeriodEnd } },
        _sum: { revenue: true },
      }),
      prisma.milkSupply.groupBy({
        by: ["branchId"],
        where: { date: { gte: previousPeriodStart, lte: previousPeriodEnd } },
        _sum: { totalCost: true },
      }),
      prisma.expense.groupBy({
        by: ["branchId", "category"],
        where: { date: { gte: previousPeriodStart, lte: previousPeriodEnd } },
        _sum: { amount: true },
      }),
      prisma.branch.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      }),
    ]);

    // Totals
    const currentRevenue = currentSales.reduce(
      (sum, s) => sum + Number(s._sum.revenue ?? 0),
      0
    );
    const previousRevenue = previousSales.reduce(
      (sum, s) => sum + Number(s._sum.revenue ?? 0),
      0
    );
    const currentCosts = currentSupplies.reduce(
      (sum, s) => sum + Number(s._sum.totalCost ?? 0),
      0
    );
    const previousCosts = previousSupplies.reduce(
      (sum, s) => sum + Number(s._sum.totalCost ?? 0),
      0
    );
    const currentExpensesTotal = currentExpenses.reduce(
      (sum, e) => sum + Number(e._sum.amount ?? 0),
      0
    );
    const previousExpensesTotal = previousExpenses.reduce(
      (sum, e) => sum + Number(e._sum.amount ?? 0),
      0
    );

    const currentProfit = currentRevenue - currentCosts - currentExpensesTotal;
    const previousProfit =
      previousRevenue - previousCosts - previousExpensesTotal;

    // Branch-level data
    const branchData: BranchData[] = branches.map((branch) => {
      const currentSale = currentSales.find((s) => s.branchId === branch.id);
      const previousSale = previousSales.find((s) => s.branchId === branch.id);
      const currentSupply = currentSupplies.find(
        (s) => s.branchId === branch.id
      );
      const previousSupply = previousSupplies.find(
        (s) => s.branchId === branch.id
      );
      const currentBranchExpenses = currentExpenses
        .filter((e) => e.branchId === branch.id)
        .reduce((sum, e) => sum + Number(e._sum.amount ?? 0), 0);
      const previousBranchExpenses = previousExpenses
        .filter((e) => e.branchId === branch.id)
        .reduce((sum, e) => sum + Number(e._sum.amount ?? 0), 0);

      const currentRev = Number(currentSale?._sum.revenue ?? 0);
      const previousRev = Number(previousSale?._sum.revenue ?? 0);
      const currentCost = Number(currentSupply?._sum.totalCost ?? 0);
      const previousCost = Number(previousSupply?._sum.totalCost ?? 0);

      return {
        name: branch.name,
        currentRevenue: currentRev,
        previousRevenue: previousRev,
        currentProfit: currentRev - currentCost - currentBranchExpenses,
        previousProfit: previousRev - previousCost - previousBranchExpenses,
      };
    });

    // Loss-making branches with reasons
    const lossMakingBranches = branchData
      .filter((b) => b.currentProfit < 0)
      .map((b) => {
        const branchId = branches.find((br) => br.name === b.name)?.id;
        const branchExpenses = currentExpenses
          .filter((e) => e.branchId === branchId)
          .reduce((sum, e) => sum + Number(e._sum.amount ?? 0), 0);

        let reason = "high costs";
        if (b.currentRevenue === 0) {
          reason = "no sales";
        } else if (branchExpenses / b.currentRevenue > 0.8) {
          reason = "high expense ratio";
        }

        return { name: b.name, loss: Math.abs(b.currentProfit), reason };
      });

    // Expense categories
    const EXPENSE_CATEGORIES = [
      "SALARIES",
      "MEALS",
      "RENT",
      "TRANSPORT",
      "UTILITIES",
      "MAINTENANCE",
      "MISCELLANEOUS",
    ] as const;

    const expenseCategories: InsightExpenseCategory[] =
      EXPENSE_CATEGORIES.map((cat) => ({
        name: cat.charAt(0) + cat.slice(1).toLowerCase(),
        currentAmount: currentExpenses
          .filter((e) => e.category === cat)
          .reduce((sum, e) => sum + Number(e._sum.amount ?? 0), 0),
        previousAmount: previousExpenses
          .filter((e) => e.category === cat)
          .reduce((sum, e) => sum + Number(e._sum.amount ?? 0), 0),
      }));

    // Branch performance for top-performer insight
    const totalProfit = branchData.reduce(
      (sum, b) => sum + b.currentProfit,
      0
    );
    const branchPerformance = branchData.map((b) => ({
      name: b.name,
      profit: b.currentProfit,
      profitShare:
        totalProfit > 0 ? (b.currentProfit / totalProfit) * 100 : 0,
    }));

    // Generate all 4 insights
    return [
      generateRevenueInsight({ currentRevenue, previousRevenue, branches: branchData }),
      generateProfitInsight({ currentProfit, previousProfit, lossMakingBranches }),
      generateExpenseInsight({
        currentExpenses: currentExpensesTotal,
        previousExpenses: previousExpensesTotal,
        categories: expenseCategories,
      }),
      generateTopPerformerInsight(branchPerformance),
    ].slice(0, 4);
  } catch (error) {
    console.error("Insights generation failed:", error);
    return [
      {
        type: "REVENUE",
        icon: "Activity",
        title: "Insights temporarily unavailable",
        description:
          "Unable to generate insights at this time. Please refresh to try again.",
        trend: "STABLE",
      },
    ];
  }
}

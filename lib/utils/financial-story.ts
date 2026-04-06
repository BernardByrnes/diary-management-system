// ─── Types ────────────────────────────────────────────────────────────────────

export type FinancialStoryData = {
  period: {
    month: string; // e.g., "June"
    year: number; // e.g., 2025
  };
  totalRevenue: number;
  totalCosts: number;
  totalExpenses: number;
  totalProfit: number;
  branches: Array<{
    name: string;
    revenue: number;
    profit: number;
    profitShare: number; // % of total profit
  }>;
  lossBranches: Array<{
    name: string;
    loss: number;
    reason: string;
  }>;
  payments: {
    totalSupplierPayments: number;
    outstandingAdvances: number;
  };
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-UG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Main Function ────────────────────────────────────────────────────────────

export function generateFinancialStory(data: FinancialStoryData): string {
  // EDGE CASE: No financial activity
  if (
    data.totalRevenue === 0 &&
    data.totalCosts === 0 &&
    data.totalExpenses === 0
  ) {
    return `No financial activity was recorded for ${data.period.month} ${data.period.year}. Please verify that all transactions have been entered into the system.`;
  }

  const paragraphs: string[] = [];

  // ── Paragraph 1: Overview ──────────────────────────────────────────────────

  let overviewPara = `In ${data.period.month} ${data.period.year}, the Bwera Cooperative generated UGX ${formatMoney(data.totalRevenue)} in revenue, with total milk costs of UGX ${formatMoney(data.totalCosts)} and operational expenses of UGX ${formatMoney(data.totalExpenses)}, `;

  if (data.totalProfit >= 0) {
    overviewPara += `resulting in a net profit of UGX ${formatMoney(data.totalProfit)}.`;
  } else {
    overviewPara += `resulting in a net loss of UGX ${formatMoney(Math.abs(data.totalProfit))}.`;
  }

  paragraphs.push(overviewPara);

  // ── Paragraph 2: Branch Performance ───────────────────────────────────────

  if (data.branches.length === 0) {
    paragraphs.push("No branch-level data is available for this period.");
  } else {
    const sortedBranches = [...data.branches].sort(
      (a, b) => b.profitShare - a.profitShare
    );
    const topBranch = sortedBranches[0];

    let branchPara = `Branch performance was led by ${topBranch.name}, which contributed UGX ${formatMoney(topBranch.profit)} (${topBranch.profitShare.toFixed(1)}% of total profit).`;

    if (sortedBranches.length > 1 && sortedBranches[1].profit > 0) {
      const secondBranch = sortedBranches[1];
      branchPara += ` ${secondBranch.name} followed with UGX ${formatMoney(secondBranch.profit)} (${secondBranch.profitShare.toFixed(1)}%).`;
    }

    if (data.lossBranches.length > 0) {
      if (data.lossBranches.length === 1) {
        const lossBranch = data.lossBranches[0];
        branchPara += ` However, ${lossBranch.name} recorded a loss of UGX ${formatMoney(lossBranch.loss)}, primarily due to ${lossBranch.reason}.`;
      } else {
        const lossNames = data.lossBranches
          .map((b) => b.name)
          .slice(0, 3)
          .join(", ");
        const totalLosses = data.lossBranches.reduce(
          (sum, b) => sum + b.loss,
          0
        );
        branchPara += ` However, ${data.lossBranches.length} branch${data.lossBranches.length > 1 ? "es" : ""} (${lossNames}${data.lossBranches.length > 3 ? ", and others" : ""}) recorded combined losses of UGX ${formatMoney(totalLosses)}.`;

        const reasons = data.lossBranches.map((b) => b.reason);
        const reasonCounts = reasons.reduce(
          (acc, r) => {
            acc[r] = (acc[r] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );
        const mostCommonReason = Object.entries(reasonCounts).sort(
          (a, b) => b[1] - a[1]
        )[0][0];
        branchPara += ` The main contributing factor was ${mostCommonReason}.`;
      }
    }

    paragraphs.push(branchPara);
  }

  // ── Paragraph 3: Financial Obligations ────────────────────────────────────

  if (data.payments.totalSupplierPayments === 0) {
    paragraphs.push("No supplier payments were scheduled for this period.");
  } else {
    let paymentPara = `Supplier payments totaling UGX ${formatMoney(data.payments.totalSupplierPayments)} are scheduled for this period`;

    if (data.payments.outstandingAdvances > 0) {
      paymentPara += `, with UGX ${formatMoney(data.payments.outstandingAdvances)} in outstanding advances across suppliers and branch owners.`;

      const advanceRatio =
        data.payments.outstandingAdvances /
        data.payments.totalSupplierPayments;
      if (advanceRatio > 0.3) {
        paymentPara += ` Note: Outstanding advances are notably high (${(advanceRatio * 100).toFixed(0)}% of payment obligations) and require attention to ensure healthy cash flow.`;
      }
    } else {
      paymentPara += ".";
    }

    paragraphs.push(paymentPara);
  }

  return paragraphs.join("\n\n");
}

export function computeGrossProfit(
  totalRevenue: number,
  totalMilkCosts: number,
  totalExpenses: number
): number {
  return totalRevenue - totalMilkCosts - totalExpenses;
}

/** Owner net payout after advances; never negative. */
export function computeDistributionNetPayout(
  grossProfit: number,
  advanceDeductions: number
): number {
  return Math.max(0, grossProfit - advanceDeductions);
}

/** Spread annual rent evenly across 12 months (same as one month’s share). */
export function prorateAnnualRentToMonthly(annualRent: number): number {
  return annualRent / 12;
}

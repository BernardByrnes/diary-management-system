export function bankingDepositDifference(
  expectedDeposit: number,
  recordedAmount: number
): number {
  return Math.abs(recordedAmount - expectedDeposit);
}

/**
 * Flag when |actual − expected| is **strictly greater than** threshold (not equal).
 * Matches banking POST: `diff > threshold`.
 */
export function shouldFlagBankingDiscrepancy(
  expectedDeposit: number,
  recordedAmount: number,
  threshold: number
): boolean {
  return bankingDepositDifference(expectedDeposit, recordedAmount) > threshold;
}

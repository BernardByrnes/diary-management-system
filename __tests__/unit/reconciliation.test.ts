import { describe, expect, test } from "vitest";
import { shouldFlagBankingDiscrepancy } from "@/lib/utils/reconciliation";

describe("banking reconciliation flag", () => {
  test("expected equals actual → no discrepancy", () => {
    expect(shouldFlagBankingDiscrepancy(100_000, 100_000, 5000)).toBe(false);
  });

  test("difference > 5000 threshold → flag", () => {
    expect(shouldFlagBankingDiscrepancy(100_000, 106_001, 5000)).toBe(true);
  });

  test("difference = exactly 5000 → no flag (greater than, not >=)", () => {
    expect(shouldFlagBankingDiscrepancy(100_000, 105_000, 5000)).toBe(false);
  });
});

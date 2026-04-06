import { describe, expect, test } from "vitest";
import {
  computeDistributionNetPayout,
  computeGrossProfit,
  prorateAnnualRentToMonthly,
} from "@/lib/utils/profit-distribution";

describe("profit distribution", () => {
  test("revenue 5M - costs 3M - expenses 800K = 1.2M gross", () => {
    expect(computeGrossProfit(5_000_000, 3_000_000, 800_000)).toBe(1_200_000);
  });

  test("with 200K advance → net payout 1M", () => {
    const gross = computeGrossProfit(5_000_000, 3_000_000, 800_000);
    expect(computeDistributionNetPayout(gross, 200_000)).toBe(1_000_000);
  });

  test("loss scenario → payout = 0, not negative", () => {
    const gross = computeGrossProfit(1_000_000, 2_000_000, 500_000);
    expect(gross).toBeLessThan(0);
    expect(computeDistributionNetPayout(gross, 0)).toBe(0);
    expect(computeDistributionNetPayout(gross, 100_000)).toBe(0);
  });

  test("annual rent prorated to monthly", () => {
    expect(prorateAnnualRentToMonthly(1_200_000)).toBe(100_000);
  });
});

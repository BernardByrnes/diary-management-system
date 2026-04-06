import { describe, expect, test } from "vitest";
import {
  computeSupplierNetAmount,
  grossFromDeliveryLiters,
  sumDeliveriesGross,
} from "@/lib/utils/supplier-payment";

describe("supplier payment calculations", () => {
  test("500L at 1200/L = 600,000 gross", () => {
    expect(grossFromDeliveryLiters(500, 1200)).toBe(600_000);
  });

  test("600,000 gross - 200,000 advance = 400,000 net", () => {
    expect(computeSupplierNetAmount(600_000, 200_000)).toBe(400_000);
  });

  test("advance exceeds gross → net = 0, NOT negative", () => {
    expect(computeSupplierNetAmount(100_000, 150_000)).toBe(0);
  });

  test("multiple deliveries at different rates sum correctly", () => {
    expect(
      sumDeliveriesGross([
        { liters: 200, costPerLiter: 1200 },
        { liters: 100, costPerLiter: 1350 },
      ])
    ).toBe(200 * 1200 + 100 * 1350);
  });

  test("decimal liters: 150.5L × 1200 = 180,600", () => {
    expect(grossFromDeliveryLiters(150.5, 1200)).toBe(180_600);
  });
});

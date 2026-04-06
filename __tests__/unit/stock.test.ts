import { describe, expect, test } from "vitest";
import { computeSameDayNetLiters } from "@/lib/utils/stock";

describe("computeSameDayNetLiters", () => {
  test("200L received, 150 sold = 50 remaining", () => {
    expect(
      computeSameDayNetLiters({
        supplyLiters: 200,
        soldLiters: 150,
        transferOutLiters: 0,
        transferInLiters: 0,
      })
    ).toBe(50);
  });

  test("200L received, 50 sold, 30 transferred out = 120", () => {
    expect(
      computeSameDayNetLiters({
        supplyLiters: 200,
        soldLiters: 50,
        transferOutLiters: 30,
        transferInLiters: 0,
      })
    ).toBe(120);
  });

  test("transfers in add to stock", () => {
    expect(
      computeSameDayNetLiters({
        supplyLiters: 100,
        soldLiters: 0,
        transferOutLiters: 0,
        transferInLiters: 40,
      })
    ).toBe(140);
  });

  test("zero received = zero stock (no sales/transfers)", () => {
    expect(
      computeSameDayNetLiters({
        supplyLiters: 0,
        soldLiters: 0,
        transferOutLiters: 0,
        transferInLiters: 0,
      })
    ).toBe(0);
  });

  test("stock does NOT carry over between days (each day is computed in isolation)", () => {
    const day1 = computeSameDayNetLiters({
      supplyLiters: 100,
      soldLiters: 40,
      transferOutLiters: 0,
      transferInLiters: 0,
    });
    const day2 = computeSameDayNetLiters({
      supplyLiters: 50,
      soldLiters: 10,
      transferOutLiters: 0,
      transferInLiters: 0,
    });
    expect(day1).toBe(60);
    expect(day2).toBe(40);
    expect(day2).not.toBe(day1 - 50);
  });
});

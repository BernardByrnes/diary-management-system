import { describe, expect, test } from "vitest";
import { isLactometerReadingInRange } from "@/lib/utils/lactometer-range";

const MIN = 1.026;
const MAX = 1.032;

describe("lactometer range (inclusive)", () => {
  test("1.029 → in range", () => {
    expect(isLactometerReadingInRange(1.029, MIN, MAX)).toBe(true);
  });

  test("1.026 → in range (boundary)", () => {
    expect(isLactometerReadingInRange(1.026, MIN, MAX)).toBe(true);
  });

  test("1.025 → out of range", () => {
    expect(isLactometerReadingInRange(1.025, MIN, MAX)).toBe(false);
  });

  test("1.033 → out of range", () => {
    expect(isLactometerReadingInRange(1.033, MIN, MAX)).toBe(false);
  });
});

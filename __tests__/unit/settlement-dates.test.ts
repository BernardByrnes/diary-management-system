import { describe, expect, test } from "vitest";
import {
  dateKeyLocal,
  holidayDateSet,
  toSettlementBusinessDay,
  type PublicHolidayEntry,
} from "@/lib/utils/business-days";
import { UGANDA_FIXED_PUBLIC_HOLIDAYS } from "@/lib/utils/uganda-fixed-holidays";

const emptyExtra = new Set<string>();

function localDate(y: number, monthIndex: number, day: number): Date {
  const d = new Date(y, monthIndex, day);
  d.setHours(12, 0, 0, 0);
  return d;
}

describe("toSettlementBusinessDay", () => {
  test("weekday that is not a holiday → no shift", () => {
    const d = localDate(2026, 0, 14);
    const r = toSettlementBusinessDay(d, emptyExtra);
    expect(dateKeyLocal(r)).toBe("2026-01-14");
  });

  test("Saturday → previous Friday", () => {
    const sat = localDate(2026, 0, 31);
    expect(sat.getDay()).toBe(6);
    const r = toSettlementBusinessDay(sat, emptyExtra);
    expect(dateKeyLocal(r)).toBe("2026-01-30");
  });

  test("Sunday → previous Friday", () => {
    const sun = localDate(2026, 1, 1);
    expect(sun.getDay()).toBe(0);
    const r = toSettlementBusinessDay(sun, emptyExtra);
    expect(dateKeyLocal(r)).toBe("2026-01-30");
  });

  test("month-end on Saturday → previous Friday", () => {
    const sat = localDate(2026, 0, 31);
    const r = toSettlementBusinessDay(sat, emptyExtra);
    expect(dateKeyLocal(r)).toBe("2026-01-30");
  });

  test.each(
    UGANDA_FIXED_PUBLIC_HOLIDAYS.map((h) => [h.name, h.month, h.day] as const)
  )(
    "Uganda fixed holiday %s (month=%s day=%s) shifts to previous business day",
    (_name, month, day) => {
      const d = localDate(2026, month, day);
      const r = toSettlementBusinessDay(d, emptyExtra);
      expect(r.getDay()).not.toBe(0);
      expect(r.getDay()).not.toBe(6);
      const rk = dateKeyLocal(r);
      const dk = dateKeyLocal(d);
      expect(rk < dk).toBe(true);
    }
  );

  test("Settings-configured holiday (DB list) shifts backward", () => {
    const extras = holidayDateSet([
      { date: "2026-06-15", name: "Custom" },
    ] as PublicHolidayEntry[]);
    const d = localDate(2026, 5, 15);
    const r = toSettlementBusinessDay(d, extras);
    expect(dateKeyLocal(r)).toBe("2026-06-12");
  });

  test("Liberation Day on Monday → lands on previous Friday", () => {
    const d = localDate(2026, 0, 26);
    expect(d.getDay()).toBe(1);
    const r = toSettlementBusinessDay(d, emptyExtra);
    expect(dateKeyLocal(r)).toBe("2026-01-23");
  });

  test("two consecutive holidays 25 + 26 Dec (Wed+Thu 2025) → payment lands on 24th (Tuesday)", () => {
    const boxing = localDate(2025, 11, 26);
    const r = toSettlementBusinessDay(boxing, emptyExtra);
    expect(dateKeyLocal(r)).toBe("2025-12-24");
  });

  test("holiday + weekend chain until a real business day", () => {
    const sunWomens = localDate(2026, 2, 8);
    expect(sunWomens.getDay()).toBe(0);
    const r = toSettlementBusinessDay(sunWomens, emptyExtra);
    expect(dateKeyLocal(r)).toBe("2026-03-06");
  });
});

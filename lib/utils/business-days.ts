/**
 * Settlement / supplier payment dates: skip weekends, Uganda fixed public holidays,
 * and extra configurable dates (Eid etc. — maintained yearly in Settings).
 */

import { isUgandaFixedPublicHoliday } from "@/lib/utils/uganda-fixed-holidays";

export type PublicHolidayEntry = { date: string; name?: string };

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** Calendar day in local timezone (matches HTML date inputs and UG operations). */
export function dateKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function holidayDateSet(entries: PublicHolidayEntry[]): Set<string> {
  const s = new Set<string>();
  for (const e of entries) {
    if (e?.date && typeof e.date === "string") {
      s.add(e.date.trim().slice(0, 10));
    }
  }
  return s;
}

export function isPublicHoliday(d: Date, holidays: Set<string>): boolean {
  return holidays.has(dateKeyLocal(d));
}

/**
 * If the date falls on Sat, Sun, a Uganda fixed public holiday, or a listed extra holiday,
 * move backward day by day until a working day is found (max 14 steps).
 */
export function toSettlementBusinessDay(d: Date, holidays: Set<string>): Date {
  const x = new Date(d.getTime());
  x.setHours(12, 0, 0, 0);
  let guard = 0;
  while (
    (isWeekend(x) ||
      isPublicHoliday(x, holidays) ||
      isUgandaFixedPublicHoliday(x)) &&
    guard < 14
  ) {
    x.setDate(x.getDate() - 1);
    guard++;
  }
  return x;
}

/** Weekend adjustment only (no holidays). */
export function toPreviousWeekendOnlyBusinessDay(d: Date): Date {
  return toSettlementBusinessDay(d, new Set());
}

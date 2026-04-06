/**
 * Nationally recognised Uganda public holidays that fall on the same calendar date
 * every year (not Easter/Eid — those belong in Settings → public holidays).
 *
 * Sources: Public Holidays Act and common official listings; verify with Uganda
 * Government / gazette if your cooperative needs legal precision.
 */

export type UgandaFixedHoliday = { month: number; day: number; name: string };

/** month is 0-indexed (JS Date), day is 1–31 */
export const UGANDA_FIXED_PUBLIC_HOLIDAYS: readonly UgandaFixedHoliday[] = [
  { month: 0, day: 1, name: "New Year's Day" },
  { month: 0, day: 26, name: "Liberation Day" },
  { month: 1, day: 16, name: "Archbishop Janani Luwum Day" },
  { month: 2, day: 8, name: "International Women's Day" },
  { month: 4, day: 1, name: "Labour Day" },
  { month: 5, day: 3, name: "Martyrs' Day" },
  { month: 5, day: 9, name: "National Heroes' Day" },
  { month: 9, day: 9, name: "Independence Day" },
  { month: 11, day: 25, name: "Christmas Day" },
  { month: 11, day: 26, name: "Boxing Day" },
] as const;

/**
 * True if this calendar day (local timezone) is a fixed Uganda public holiday.
 * Does not include Good Friday, Easter Monday, Eid al-Fitr, or Eid al-Adha.
 */
export function isUgandaFixedPublicHoliday(d: Date): boolean {
  const month = d.getMonth();
  const day = d.getDate();
  return UGANDA_FIXED_PUBLIC_HOLIDAYS.some((h) => h.month === month && h.day === day);
}

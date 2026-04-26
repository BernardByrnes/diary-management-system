/**
 * Centralized date formatting for consistent display across the application.
 * All functions accept Date | string | number for flexibility with Prisma results.
 */

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/** e.g. "25 Apr 2026" */
export function formatDate(value: Date | string | number): string {
  return toDate(value).toLocaleDateString("en-UG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** e.g. "25/04/2026" */
export function formatDateShort(value: Date | string | number): string {
  return toDate(value).toLocaleDateString("en-UG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** e.g. "Apr 2026" */
export function formatMonthYear(value: Date | string | number): string {
  return toDate(value).toLocaleDateString("en-UG", {
    month: "short",
    year: "numeric",
  });
}

/** e.g. "25 Apr 2026, 14:30" */
export function formatDateTime(value: Date | string | number): string {
  return toDate(value).toLocaleDateString("en-UG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** e.g. "2026-04-25" — for HTML date inputs and API params */
export function formatDateISO(value: Date | string | number): string {
  const d = toDate(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** e.g. "14:30" */
export function formatTime(value: Date | string | number): string {
  return toDate(value).toLocaleTimeString("en-UG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** "1 Apr – 15 Apr 2026" */
export function formatPeriod(
  start: Date | string | number,
  end: Date | string | number,
): string {
  const s = toDate(start);
  const e = toDate(end);
  const startLabel = s.toLocaleDateString("en-UG", { day: "numeric", month: "short" });
  const endLabel = e.toLocaleDateString("en-UG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

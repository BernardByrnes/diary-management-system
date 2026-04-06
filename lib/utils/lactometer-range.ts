/**
 * Normal lactometer range is inclusive on both ends (defaults match SystemSettings seed).
 */
export function isLactometerReadingInRange(
  reading: number,
  min: number,
  max: number
): boolean {
  return reading >= min && reading <= max;
}

/**
 * Normalise a lactometer reading entered as shorthand.
 * Field staff often record just the last digits (e.g. 29 meaning 1.029).
 * Any value > 1.1 is treated as shorthand and converted: 29 → 1.029.
 * Values already in 1.0XX form are returned unchanged.
 */
export function normalizeLactometerReading(value: number): number {
  if (value > 1.1) {
    return 1 + value / 1000;
  }
  return value;
}

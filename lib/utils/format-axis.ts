/**
 * Format large numbers for chart axes
 * 1,200 → 1.2K
 * 1,200,000 → 1.2M
 * 5,600,000,000 → 5.6B
 */
export function formatAxisNumber(value: number): string {
  const absValue = Math.abs(value)

  if (absValue >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`
  }

  if (absValue >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }

  if (absValue >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`
  }

  return value.toString()
}

/**
 * Format currency for axis (no decimals, K/M suffix)
 */
export function formatAxisCurrency(value: number): string {
  const formatted = formatAxisNumber(value)
  return `UGX ${formatted}`
}

/**
 * Format percentage for axis
 */
export function formatAxisPercent(value: number): string {
  return `${value.toFixed(0)}%`
}

export { formatAxisNumber as formatAxis }

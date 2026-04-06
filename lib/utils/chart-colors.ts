/**
 * Theme-aware chart color palette.
 * Pass isDark=true when rendering in a dark context.
 * Can be extended with next-themes if dark mode toggle is added.
 */
export function getChartColors(isDark = false) {
  return {
    grid: isDark ? '#374151' : '#F3F4F6',
    axis: isDark ? '#6b7280' : '#D1D5DB',
    text: isDark ? '#D1D5DB' : '#6B7280',
    textMuted: isDark ? '#9CA3AF' : '#9CA3AF',
    background: isDark ? '#1f2937' : '#ffffff',
    tooltipBg: isDark ? '#1f2937' : '#ffffff',
    tooltipBorder: isDark ? '#374151' : '#F3F4F6',
    // Data colors (same in both modes)
    primary: '#3B82F6',
    secondary: '#16A34A',
    tertiary: '#F59E0B',
    quaternary: '#8B5CF6',
    danger: '#EF4444',
    info: '#06B6D4',
  }
}

/**
 * Standard palette for multi-series charts
 */
export const CHART_PALETTE = [
  '#16A34A', // green
  '#3B82F6', // blue
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EF4444', // red
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#84CC16', // lime
  '#F97316', // orange
  '#6366F1', // indigo
]

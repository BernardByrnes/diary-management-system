'use client'

import { TooltipProps } from 'recharts'

type CustomTooltipProps = {
  active?: boolean
  payload?: Array<{ value: number; color: string; name?: string }>
  label?: string
  prefix?: string
  suffix?: string
  showChange?: boolean
  previousData?: number
}

export function CustomTooltip({
  active,
  payload,
  label,
  prefix = '',
  suffix = '',
  showChange = false,
  previousData
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null
  }

  const value = payload[0].value as number

  let percentChange: number | null = null
  if (showChange && previousData !== undefined && previousData !== 0) {
    percentChange = ((value - previousData) / previousData) * 100
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-[140px]">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </p>

      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
        {prefix && <span className="text-sm font-normal mr-1">{prefix}</span>}
        {formatNumber(value)}
        {suffix && <span className="text-sm font-normal ml-1">{suffix}</span>}
      </p>

      {showChange && percentChange !== null && (
        <div
          className={`
          flex items-center gap-1 mt-1 text-xs font-medium
          ${
            percentChange >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }
        `}
        >
          <span>{percentChange >= 0 ? '↗' : '↘'}</span>
          <span>{Math.abs(percentChange).toFixed(1)}%</span>
        </div>
      )}

      <div
        className="absolute left-3 top-3 w-2 h-2 rounded-full"
        style={{ backgroundColor: payload[0].color }}
      />
    </div>
  )
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-UG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num)
}

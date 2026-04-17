'use client'

import { useId } from 'react'
import {
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { formatAxisCurrency } from '@/lib/utils/format-axis'

export interface TrendDataPoint {
  date: string
  label: string
  value: number
}

interface TrendChartProps {
  data: TrendDataPoint[]
  title?: string
  subtitle?: string
  prefix?: string
  suffix?: string
  color?: string
  showGradient?: boolean
  height?: number
}

export function TrendChart({
  data,
  title,
  subtitle,
  prefix = 'UGX ',
  suffix = '',
  color = '#3b82f6',
  showGradient = true,
  height = 320
}: TrendChartProps) {
  const uid = useId().replace(/:/g, '')
  const gradientId = `gradient-${uid}`

  // Empty state
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
        {/* Header */}
        {(title || subtitle) && (
          <div className="mb-5">
            {title && <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
          </div>
        )}
        <div className={`h-[${height}px] flex items-center justify-center`}>
          <div className="text-center">
            <TrendingUp className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No trend data</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Data will appear here once recorded</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-5">
          {title && <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h3>}
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
        >
          <defs>
            {showGradient && (
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            )}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#d1d5db' }}
          />

          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#d1d5db' }}
            tickFormatter={formatAxisCurrency}
          />

          <Tooltip content={<CustomTooltip prefix={prefix} suffix={suffix} />} />

          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            fill={showGradient ? `url(#${gradientId})` : color}
            fillOpacity={showGradient ? 1 : 0.1}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

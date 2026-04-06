"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { CustomTooltip } from "@/components/charts/CustomTooltip";
import { formatAxisCurrency } from "@/lib/utils/format-axis";

export interface BranchStat {
  name: string;
  revenue: number;
  milkCost: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
}

interface BranchPerformanceChartProps {
  stats: BranchStat[];
}

const fmtUGX = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
};

interface RcTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const SERIES = [
  { key: "revenue", label: "Revenue", color: "#16A34A" },
  { key: "milkCost", label: "Milk Cost", color: "#3B82F6" },
  { key: "expenses", label: "Expenses", color: "#F59E0B" },
  { key: "netProfit", label: "Net Profit", color: "#8B5CF6" },
] as const;

export default function BranchPerformanceChart({ stats }: BranchPerformanceChartProps) {
  if (stats.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-gray-900 text-sm">Branch Comparison</h2>
          <span className="text-xs text-gray-400">Grouped by branch</span>
        </div>
        <div className="h-[280px] flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">No branch data</p>
            <p className="text-xs text-gray-400 mt-1">Data will appear here once transactions are recorded</p>
          </div>
        </div>
      </div>
    );
  }

  const hasNegative = stats.some((s) => s.netProfit < 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-gray-900 text-sm">Branch Comparison</h2>
        <span className="text-xs text-gray-400">Grouped by branch</span>
      </div>
      <p className="text-xs text-gray-400 mb-5">UGX — hover bars for exact values</p>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={stats}
          margin={{ top: 4, right: 8, left: -8, bottom: 4 }}
          barCategoryGap="25%"
          barGap={3}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatAxisCurrency}
            width={52}
          />
          {hasNegative && (
            <ReferenceLine y={0} stroke="#E5E7EB" strokeWidth={1.5} />
          )}
          <Tooltip
            content={<CustomTooltip prefix="UGX " />}
            cursor={{ fill: "#F9FAFB", radius: 4 }}
          />
          <Legend
            verticalAlign="top"
            iconType="circle"
            iconSize={8}
            height={36}
            wrapperStyle={{ fontSize: 11, paddingBottom: 8, color: "#6B7280" }}
            formatter={(value) => (
              <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>{value}</span>
            )}
          />
          {SERIES.map(({ key, label, color }) => (
            <Bar
              key={key}
              dataKey={key}
              name={label}
              fill={color}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
              animationBegin={0}
              activeBar={{ fill: color, opacity: 0.7 }}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

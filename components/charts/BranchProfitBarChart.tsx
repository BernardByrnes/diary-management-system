"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { CustomTooltip } from "@/components/charts/CustomTooltip";
import { formatAxisCurrency } from "@/lib/utils/format-axis";

export interface BranchProfitData {
  name: string;
  revenue: number;
  milkCost: number;
  expenses: number;
  netProfit: number;
}

const fmtUGX = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
};

interface RcTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}

export default function BranchProfitBarChart({ branches }: { branches: BranchProfitData[] }) {
  if (branches.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-gray-900 text-sm">Net Profit by Branch</h2>
          <span className="text-xs text-gray-400">This period</span>
        </div>
        <div className="h-[240px] flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">No profit data</p>
            <p className="text-xs text-gray-400 mt-1">Data will appear here once transactions are recorded</p>
          </div>
        </div>
      </div>
    );
  }

  const hasNegative = branches.some((b) => b.netProfit < 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-gray-900 text-sm">Net Profit by Branch</h2>
        <span className="text-xs text-gray-400">This period</span>
      </div>
      <p className="text-xs text-gray-400 mb-5">UGX — hover for exact value</p>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={branches}
          margin={{ top: 4, right: 8, left: -8, bottom: 4 }}
          barCategoryGap="35%"
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
          <Bar
            dataKey="netProfit"
            name="Net Profit"
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
            animationBegin={0}
            activeBar={{ opacity: 0.7 }}
          >
            {branches.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.netProfit >= 0 ? "#16A34A" : "#EF4444"}
                opacity={0.9}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Mini legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-600 inline-block" />
          <span className="text-xs text-gray-500">Profitable</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          <span className="text-xs text-gray-500">Loss</span>
        </div>
      </div>
    </div>
  );
}

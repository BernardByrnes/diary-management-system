"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

interface DonutChartProps {
  revenue: number;
  expenses: number;
  milkCost?: number;
}

function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

interface RcTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
}

function CustomTooltip({ active, payload }: RcTooltipProps) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: data } = payload[0];
  return (
    <div className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
      <p className="font-semibold mb-0.5">{name}</p>
      <p className="font-mono">UGX {value.toLocaleString()}</p>
    </div>
  );
}

const COLORS = {
  revenue: "#16A34A",
  milkCost: "#3B82F6",
  expenses: "#F59E0B",
};

export default function DonutChart({ revenue, expenses, milkCost = 0 }: DonutChartProps) {
  const totalCosts = expenses + milkCost;
  const net = revenue - totalCosts;
  const isProfit = net >= 0;
  const total = revenue + expenses + milkCost;

  if (total === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">Revenue vs Costs</h3>
          <span className="text-xs text-gray-400">This month</span>
        </div>
        <div className="h-[180px] flex items-center justify-center">
          <div className="text-center">
            <PieChartIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">No transaction data</p>
            <p className="text-xs text-gray-400 mt-1">Record transactions to see the breakdown</p>
          </div>
        </div>
      </div>
    );
  }

  const data = [
    { name: "Revenue", value: revenue > 0 ? revenue : 0.001, color: COLORS.revenue },
    { name: "Milk Cost", value: milkCost > 0 ? milkCost : 0.001, color: COLORS.milkCost },
    { name: "Expenses", value: expenses > 0 ? expenses : 0.001, color: COLORS.expenses },
  ];

  const revPct = total > 0 ? (revenue / total) * 100 : 33;
  const costPct = total > 0 ? (milkCost / total) * 100 : 33;
  const expPct = total > 0 ? (expenses / total) * 100 : 34;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Revenue vs Costs</h3>
        <span className="text-xs text-gray-400">This month</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie
                data={data}
                cx={55}
                cy={55}
                innerRadius={34}
                outerRadius={52}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                strokeWidth={0}
                paddingAngle={2}
                isAnimationActive={true}
                animationDuration={800}
                animationBegin={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-gray-500 leading-tight">
              {isProfit ? "Profit" : "Loss"}
            </span>
            <span
              className={`text-sm font-bold font-mono leading-tight ${
                isProfit ? "text-green-700" : "text-red-600"
              }`}
            >
              {fmtK(Math.abs(net))}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-600" />
                <span className="text-xs text-gray-500">Revenue</span>
              </div>
              <span className="text-xs font-bold text-gray-800 font-mono">
                {fmtK(revenue)}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-700"
                style={{ width: `${revPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs text-gray-500">Milk Cost</span>
              </div>
              <span className="text-xs font-bold text-gray-800 font-mono">
                {fmtK(milkCost)}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-700"
                style={{ width: `${costPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-xs text-gray-500">Expenses</span>
              </div>
              <span className="text-xs font-bold text-gray-800 font-mono">
                {fmtK(expenses)}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-700"
                style={{ width: `${expPct}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-gray-400 pt-1">All amounts in UGX</p>
        </div>
      </div>
    </div>
  );
}
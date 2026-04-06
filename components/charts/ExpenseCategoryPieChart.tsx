"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  type PieLabelRenderProps,
} from "recharts";
import { BarChart3 } from "lucide-react";

export interface ExpenseCategoryData {
  category: string;
  amount: number;
}

const PALETTE = [
  "#16A34A",
  "#3B82F6",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
  "#06B6D4",
  "#EC4899",
  "#84CC16",
  "#F97316",
  "#6366F1",
];

function fmtUGX(v: number) {
  if (v >= 1_000_000) return `UGX ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `UGX ${(v / 1_000).toFixed(0)}K`;
  return `UGX ${v.toLocaleString()}`;
}

interface RcTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { total: number } }>;
}

function CustomPieTooltip({ active, payload }: RcTooltipProps) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const total = payload[0].payload.total;
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-xl p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-gray-800 capitalize mb-1">
        {name.toLowerCase()}
      </p>
      <p className="font-mono text-gray-700">{fmtUGX(value)}</p>
      <p className="text-gray-400 mt-0.5">{pct}% of total</p>
    </div>
  );
}

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
      {payload.map((entry) => (
        <li key={entry.value} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
            style={{ background: entry.color }}
          />
          <span className="text-xs text-gray-500 capitalize">
            {entry.value.toLowerCase()}
          </span>
        </li>
      ))}
    </ul>
  );
}

const RADIAN = Math.PI / 180;

function renderCustomLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (
    percent === undefined ||
    cx === undefined ||
    cy === undefined ||
    midAngle === undefined ||
    innerRadius === undefined ||
    outerRadius === undefined
  )
    return null;
  if (percent < 0.05) return null;
  const cxNum = typeof cx === "number" ? cx : parseFloat(String(cx));
  const cyNum = typeof cy === "number" ? cy : parseFloat(String(cy));
  const radius =
    (Number(innerRadius) + Number(outerRadius)) / 2;
  const x = cxNum + radius * Math.cos(-midAngle * RADIAN);
  const y = cyNum + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 700 }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function ExpenseCategoryPieChart({
  data,
  total,
}: {
  data: ExpenseCategoryData[];
  total: number;
}) {
  // 6.8 Empty state
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-gray-900 text-sm">Expense Distribution</h2>
          <span className="text-xs text-gray-400">By category</span>
        </div>
        <div className="h-[260px] flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">No expense data</p>
            <p className="text-xs text-gray-400 mt-1">Expenses will appear here once recorded</p>
          </div>
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.category,
    value: d.amount,
    total,
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-gray-900 text-sm">Expense Distribution</h2>
        <span className="text-xs text-gray-400">By category</span>
      </div>
      <p className="text-xs text-gray-400 mb-3">Hover to see exact amounts</p>

      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={95}
            dataKey="value"
            paddingAngle={2}
            strokeWidth={2}
            stroke="#fff"
            isAnimationActive={true}
            animationDuration={800}
            animationBegin={0}
            label={renderCustomLabel}
            labelLine={false}
          >
            {chartData.map((_, index) => (
              <Cell
                key={index}
                fill={PALETTE[index % PALETTE.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomPieTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Total */}
      <div className="text-center mt-1 pt-3 border-t border-gray-50">
        <p className="text-xs text-gray-400">Total expenses</p>
        <p className="text-sm font-bold font-mono text-gray-800">
          UGX {total.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

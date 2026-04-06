"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import { CustomTooltip } from "@/components/charts/CustomTooltip";

export interface WeeklyDataPoint {
  date: string;
  label: string;
  liters: number;
}

interface WeeklyChartProps {
  data: WeeklyDataPoint[];
}

interface RcTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}

function CustomWeeklyTooltip({ active, payload, label }: RcTooltipProps) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value ?? 0;
  return (
    <div className="bg-green-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
      <p className="font-semibold mb-0.5">{label}</p>
      <p className="font-mono">{value > 0 ? `${value.toFixed(1)} L` : "—"}</p>
    </div>
  );
}

export default function WeeklyChart({ data }: WeeklyChartProps) {
  const fmtY = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-800">Weekly Milk Collection</h3>
          <span className="text-xs text-gray-400 font-medium">Last 7 days</span>
        </div>
        <div className="h-[165px] flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-500 font-medium">No collection data</p>
            <p className="text-xs text-gray-400 mt-1">Record milk supply to see the chart</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-800">Weekly Milk Collection</h3>
        <span className="text-xs text-gray-400 font-medium">Last 7 days</span>
      </div>
      <p className="text-xs text-gray-400 mb-3">Litres per day</p>

      <ResponsiveContainer width="100%" height={165}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
          barSize={26}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "#D1D5DB" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmtY}
          />
          <Tooltip
            content={<CustomWeeklyTooltip />}
            cursor={{ fill: "#DCFCE7" }}
          />
          <Bar
            dataKey="liters"
            radius={[6, 6, 2, 2]}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
            animationBegin={0}
            activeBar={{ fill: '#4ade80' }}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.date}
                fill={index === data.length - 1 ? "#16A34A" : "#86EFAC"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

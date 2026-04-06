"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Award,
  Activity,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
} from "lucide-react";
import type { Insight } from "@/lib/utils/insights-generator";

const iconMap: Record<string, React.ElementType> = {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Award,
  Activity,
  AlertCircle,
};

const trendArrowMap = {
  UP: ArrowUpRight,
  DOWN: ArrowDownRight,
  STABLE: ArrowRight,
};

const colorMap: Record<Insight["type"], { border: string; icon: string; arrow: string }> = {
  REVENUE: {
    border: "border-l-blue-500",
    icon: "bg-blue-100 text-blue-700",
    arrow: "text-blue-500",
  },
  PROFIT: {
    border: "border-l-green-500",
    icon: "bg-green-100 text-green-700",
    arrow: "text-green-500",
  },
  EXPENSE: {
    border: "border-l-orange-500",
    icon: "bg-orange-100 text-orange-700",
    arrow: "text-orange-500",
  },
  PERFORMANCE: {
    border: "border-l-violet-500",
    icon: "bg-violet-100 text-violet-700",
    arrow: "text-violet-500",
  },
};

export default function InsightsPanelGrid({ insights }: { insights: Insight[] }) {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } },
      }}
      initial="hidden"
      animate="show"
    >
      {insights.map((insight, index) => {
        const Icon = iconMap[insight.icon] || Activity;
        const colors = colorMap[insight.type];
        const TrendArrow = insight.trend ? trendArrowMap[insight.trend] : null;

        return (
          <motion.div
            key={index}
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          >
            <div className={`bg-white rounded-xl p-5 border border-gray-100 border-l-4 ${colors.border} shadow-sm relative overflow-hidden`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.icon}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {TrendArrow && (
                  <div className={colors.arrow}>
                    <TrendArrow className="w-4 h-4" />
                  </div>
                )}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {insight.title}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {insight.description}
              </p>
              {insight.changePercent !== undefined && (
                <div className="mt-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      insight.trend === "UP"
                        ? "bg-green-100 text-green-700"
                        : insight.trend === "DOWN"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {insight.trend === "UP" ? "↗" : insight.trend === "DOWN" ? "↘" : "→"}
                    {Math.abs(insight.changePercent).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

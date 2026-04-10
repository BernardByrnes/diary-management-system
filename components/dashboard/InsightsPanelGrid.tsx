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

const colorMap: Record<Insight["type"], { bg: string; iconBg: string; iconColor: string; textColor: string }> = {
  REVENUE: {
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    textColor: "text-blue-800",
  },
  PROFIT: {
    bg: "bg-green-50",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    textColor: "text-green-800",
  },
  EXPENSE: {
    bg: "bg-orange-50",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    textColor: "text-orange-800",
  },
  PERFORMANCE: {
    bg: "bg-violet-50",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    textColor: "text-violet-800",
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
            <div className={`bg-white rounded-xl p-5 border border-gray-100 shadow-sm relative overflow-hidden ${colors.bg}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.iconBg}`}>
                  <Icon className={`w-5 h-5 ${colors.iconColor}`} />
                </div>
                {TrendArrow && (
                  <div className={colors.iconColor}>
                    <TrendArrow className="w-4 h-4" />
                  </div>
                )}
              </div>
              <h3 className={`text-sm font-semibold mb-1 ${colors.textColor}`}>
                {insight.title}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
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
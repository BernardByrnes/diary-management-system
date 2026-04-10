import { TrendingUp, TrendingDown, AlertTriangle, Info } from "lucide-react";

export type InsightType = "positive" | "warning" | "danger" | "info";

export interface Insight {
  type: InsightType;
  title: string;
  message: string;
}

const config: Record<
  InsightType,
  { bg: string; iconBg: string; iconColor: string; textColor: string; Icon: React.ElementType }
> = {
  positive: {
    bg: "bg-green-50",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    textColor: "text-green-800",
    Icon: TrendingUp,
  },
  danger: {
    bg: "bg-red-50",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    textColor: "text-red-800",
    Icon: TrendingDown,
  },
  warning: {
    bg: "bg-amber-50",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    textColor: "text-amber-800",
    Icon: AlertTriangle,
  },
  info: {
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    textColor: "text-blue-800",
    Icon: Info,
  },
};

export default function InsightsPanel({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
          <Info className="w-4 h-4 text-purple-700" />
        </div>
        <h2 className="text-sm font-semibold text-gray-900">Smart Insights</h2>
        <span className="text-xs text-gray-400">
          · auto-generated from this period&apos;s data
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {insights.map((insight, i) => {
          const c = config[insight.type];
          const Icon = c.Icon;
          return (
            <div
              key={i}
              className={`rounded-xl p-4 ${c.bg}`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${c.iconBg}`}>
                  <Icon className={`w-4 h-4 ${c.iconColor}`} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${c.textColor}`}>
                    {insight.title}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                    {insight.message}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
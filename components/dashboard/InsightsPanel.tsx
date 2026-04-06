import { getDashboardInsights } from "@/lib/utils/insights-generator";
import { Activity } from "lucide-react";
import InsightsPanelGrid from "./InsightsPanelGrid";

type InsightsPanelProps = {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
};

export async function InsightsPanel({ userId, periodStart, periodEnd }: InsightsPanelProps) {
  const insights = await getDashboardInsights(userId, periodStart, periodEnd);

  return (
    <div className="mt-8 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        Insights
      </h2>

      {insights.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
          <Activity className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            No insights available for this period
          </p>
        </div>
      ) : (
        <InsightsPanelGrid insights={insights} />
      )}
    </div>
  );
}

export function InsightsPanelSkeleton() {
  return (
    <div className="mt-8 mb-8">
      <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 animate-pulse"
          >
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 mb-4" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}

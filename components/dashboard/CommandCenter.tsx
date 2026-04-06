import { getCommandCenterAlerts } from "@/lib/utils/command-center";
import { CheckCircle2 } from "lucide-react";
import CommandCenterAlerts from "./CommandCenterAlerts";

type CommandCenterProps = {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
};

export async function CommandCenter({ userId, periodStart, periodEnd }: CommandCenterProps) {
  const alerts = await getCommandCenterAlerts(userId, periodStart, periodEnd);

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        Command Center
      </h2>

      {alerts.length === 0 ? (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
          <p className="text-lg text-green-800 dark:text-green-200 font-medium">
            All systems running smoothly
          </p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            No alerts or issues detected
          </p>
        </div>
      ) : (
        <CommandCenterAlerts alerts={alerts} />
      )}
    </div>
  );
}

export function CommandCenterSkeleton() {
  return (
    <div className="mb-8">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border-l-4 border-gray-200 dark:border-gray-700 animate-pulse"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

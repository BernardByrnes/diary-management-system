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
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Command Center
      </h2>

      {alerts.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <p className="text-lg text-green-800 font-medium">
            All systems running smoothly
          </p>
          <p className="text-sm text-green-600 mt-1">
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
      <div className="h-8 w-48 bg-gray-200 rounded mb-4 animate-pulse" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-4 border-l-4 border-gray-200 border animate-pulse"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
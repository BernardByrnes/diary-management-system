import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { Settings } from "lucide-react";
import SettingsClient from "@/components/settings/SettingsClient";

async function getOrCreateSettings() {
  const existing = await prisma.systemSettings.findUnique({
    where: { id: "singleton" },
  });
  if (existing) return existing;
  return prisma.systemSettings.create({ data: { id: "singleton" } });
}

export default async function SettingsPage() {
  const session = await auth();
  const user = session!.user as { id: string; role: string };

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    redirect("/dashboard");
  }

  const settings = await getOrCreateSettings();

  const rawHolidays = settings.publicHolidays;
  const publicHolidays = Array.isArray(rawHolidays)
    ? (rawHolidays as { date: string; name?: string }[]).map((h) => ({
        date: typeof h.date === "string" ? h.date.slice(0, 10) : "",
        name: h.name ?? "",
      }))
    : [];

  const defaultRentCycle: "ANNUAL" | "BI_ANNUAL" =
    settings.defaultRentCycle === "BI_ANNUAL" ? "BI_ANNUAL" : "ANNUAL";

  const serialized = {
    ...settings,
    lactometerMin: settings.lactometerMin.toString(),
    lactometerMax: settings.lactometerMax.toString(),
    advanceWarningThreshold: settings.advanceWarningThreshold.toString(),
    discrepancyThreshold: settings.discrepancyThreshold.toString(),
    stockVarianceThreshold: settings.stockVarianceThreshold.toString(),
    customExpenseCategories: settings.customExpenseCategories as string[],
    publicHolidays,
    defaultRentCycle,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
          <Settings className="w-5 h-5 text-green-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-400">
            Configure system-wide preferences and thresholds
          </p>
        </div>
      </div>

      <SettingsClient initialSettings={serialized} />
    </div>
  );
}

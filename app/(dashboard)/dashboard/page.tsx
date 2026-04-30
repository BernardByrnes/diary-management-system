import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
  import { prisma } from "@/lib/db/prisma";
import { checkAndCreateNotifications } from "@/lib/utils/notifications";
import type { Role } from "@prisma/client";
import { Suspense } from "react";
import {
  Droplets,
  DollarSign,
  Receipt,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";
import {
  CommandCenter,
  CommandCenterSkeleton,
} from "@/components/dashboard/CommandCenter";
import {
  InsightsPanel,
  InsightsPanelSkeleton,
} from "@/components/dashboard/InsightsPanel";

import StatCard from "@/components/dashboard/StatCard";
import HighlightCard from "@/components/dashboard/HighlightCard";
import WeeklyChart, { type WeeklyDataPoint } from "@/components/dashboard/WeeklyChart";
import ActivityFeed, { type ActivityItem } from "@/components/dashboard/ActivityFeed";
import DonutChart from "@/components/dashboard/DonutChart";
import QuickActions from "@/components/dashboard/QuickActions";
import TodayActivity, { type AuditActivityItem } from "@/components/dashboard/TodayActivity";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface StatDef {
  label: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  trend?: { value: string; positive: boolean };
  alert?: boolean;
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user as { id: string; fullName: string; role: Role };

  await checkAndCreateNotifications(user.id);

  // --- Date anchors ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  // --- Phase 1: resolve branch scope ---
  let branchIds: string[] = [];
  if (user.role === "MANAGER") {
    const assignments = await prisma.branchManager.findMany({
      where: { managerId: user.id },
      select: { branchId: true },
    });
    branchIds = assignments.map((a) => a.branchId);
  } else if (user.role === "OWNER") {
    const branches = await prisma.branch.findMany({
      where: { ownerId: user.id, isActive: true },
      select: { id: true },
    });
    branchIds = branches.map((b) => b.id);
  }

  const isED = user.role === "EXECUTIVE_DIRECTOR";
  const branchFilter =
    isED ? {} : { branchId: { in: branchIds } };

// --- Phase 2: parallel queries ---
  const [
    milkToday,
    milkYesterday,
    salesToday,
    salesMonth,
    expensesMonth,
    milkCostMonth,
    pendingTransfersCount,
    activeBranchesCount,
    recentSupply,
    weeklySupply,
    todayAuditLogs,
  ] = await Promise.all([
    prisma.milkSupply.aggregate({
      where: { ...branchFilter, date: { gte: today, lt: tomorrow } },
      _sum: { liters: true },
    }),
    prisma.milkSupply.aggregate({
      where: { ...branchFilter, date: { gte: yesterday, lt: today } },
      _sum: { liters: true },
    }),
    prisma.sale.aggregate({
      where: { ...branchFilter, date: { gte: today, lt: tomorrow } },
      _sum: { revenue: true },
    }),
    prisma.sale.aggregate({
      where: { ...branchFilter, date: { gte: monthStart } },
      _sum: { revenue: true },
    }),
    prisma.expense.aggregate({
      where: { ...branchFilter, date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.milkSupply.aggregate({
      where: { ...branchFilter, date: { gte: monthStart } },
      _sum: { totalCost: true },
    }),
    isED
    ? prisma.milkTransfer.count({ where: { status: "PENDING" } })
    : Promise.resolve(0),
    isED
    ? prisma.branch.count({ where: { isActive: true } })
    : Promise.resolve(branchIds.length),
    prisma.milkSupply.findMany({
      where: branchFilter,
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { name: true } },
        branch: { select: { name: true } },
      },
    }),
    prisma.milkSupply.findMany({
      where: { ...branchFilter, date: { gte: sevenDaysAgo } },
      select: { date: true, liters: true },
      orderBy: { date: "asc" },
    }),
    // Today's audit log activity — only for ED
    isED
      ? prisma.auditLog.findMany({
          where: { createdAt: { gte: today, lt: tomorrow } },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            user: { select: { fullName: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  // --- Process values ---
  const totalMilkToday = Number(milkToday._sum.liters ?? 0);
  const totalMilkYesterday = Number(milkYesterday._sum.liters ?? 0);
  const totalSalesToday = Number(salesToday._sum.revenue ?? 0);
  const totalSalesMonth = Number(salesMonth._sum.revenue ?? 0);
  const totalExpensesMonth = Number(expensesMonth._sum.amount ?? 0);
  const totalMilkCostMonth = Number(milkCostMonth._sum?.totalCost ?? 0);

  // --- Weekly chart data ---
  const weeklyChartData: WeeklyDataPoint[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const total = weeklySupply
      .filter((s) => new Date(s.date).toISOString().split("T")[0] === dateStr)
      .reduce((sum, s) => sum + Number(s.liters), 0);
    return {
      date: dateStr,
      label: i === 6 ? "Today" : DAY_LABELS[d.getDay()],
      liters: total,
    };
  });

  // --- Activity feed (recent milk supply entries) ---
  const activityItems: ActivityItem[] = recentSupply.map((s) => ({
    id: s.id,
    supplierName: s.supplier.name,
    branchName: s.branch.name,
    liters: Number(s.liters),
    date: s.createdAt.toISOString(),
  }));

  // --- Today's Activity (from audit log) ---
  const auditActivityItems: AuditActivityItem[] = todayAuditLogs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    userName: log.user.fullName,
    createdAt: log.createdAt.toISOString(),
  }));

  // --- Stat cards ---
  const fmtUGX = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `${(n / 1_000).toFixed(0)}K`
      : String(n);

  const stats: StatDef[] = [
    {
      label: "Revenue Today",
      value: `UGX ${fmtUGX(totalSalesToday)}`,
      subtext: `Month: UGX ${fmtUGX(totalSalesMonth)}`,
      icon: DollarSign,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      label: "Expenses This Month",
      value: `UGX ${fmtUGX(totalExpensesMonth)}`,
      icon: Receipt,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    ...(isED
      ? [
          {
            label: "Pending Transfers",
            value: String(pendingTransfersCount),
            subtext: pendingTransfersCount > 0 ? "Needs attention" : "All clear",
            icon: ArrowLeftRight,
            iconBg: pendingTransfersCount > 0 ? "bg-red-100" : "bg-gray-100",
            iconColor: pendingTransfersCount > 0 ? "text-red-600" : "text-gray-500",
            alert: pendingTransfersCount > 0,
          } satisfies StatDef,
        ]
      : [
          {
            label: "Milk Collected",
            value: `${totalMilkToday.toFixed(1)} L`,
            subtext: "Today",
            icon: Droplets,
            iconBg: "bg-blue-100",
            iconColor: "text-blue-600",
          } satisfies StatDef,
        ]),
  ];

  const firstName = user.fullName.split(" ")[0];
  const dateLabel = new Date().toLocaleDateString("en-UG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
        </div>
        {isED && (
          <div className="hidden sm:flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-gray-600">Live data</span>
          </div>
        )}
      </div>

      {/* Command Center — ED only */}
      {isED && (
        <Suspense fallback={<CommandCenterSkeleton />}>
          <CommandCenter
            userId={user.id}
            periodStart={monthStart}
            periodEnd={monthEnd}
          />
        </Suspense>
      )}

      {/* Row 1: Highlight + Stat cards */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2.7fr] gap-4">
        <HighlightCard
          litersToday={totalMilkToday}
          litersYesterday={totalMilkYesterday}
          branchCount={activeBranchesCount}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      </div>

      {/* Row 2 (ED only): Quick Actions */}
      {isED && <QuickActions />}

      {/* Insights panel — ED only */}
      {isED && (
        <Suspense fallback={<InsightsPanelSkeleton />}>
          <InsightsPanel
            userId={user.id}
            periodStart={monthStart}
            periodEnd={monthEnd}
          />
        </Suspense>
      )}

      {/* Row 3: Activity feed + Weekly chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <ActivityFeed items={activityItems} />
        </div>
        <div className="lg:col-span-2">
          <WeeklyChart data={weeklyChartData} />
        </div>
      </div>

      {/* Row 4 (ED only): Today's Activity + Donut chart */}
      {isED && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <TodayActivity items={auditActivityItems} />
          </div>
          <div className="lg:col-span-2">
            <DonutChart
              revenue={totalSalesMonth}
              expenses={totalExpensesMonth}
              milkCost={totalMilkCostMonth}
            />
          </div>
        </div>
      )}

      {/* Row 5 (ED only): System overview mini-stats */}
      {isED && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            System Overview
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {[
              { label: "Active Branches", value: activeBranchesCount },
              { label: "Pending Transfers", value: pendingTransfersCount },
              { label: "Month Revenue", value: `UGX ${fmtUGX(totalSalesMonth)}` },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-2xl font-bold text-gray-900 font-mono">
                  {item.value}
                </p>
                <p className="text-xs text-gray-400 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

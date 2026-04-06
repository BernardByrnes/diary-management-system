import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { prisma, withDbRetry } from "@/lib/db/prisma";
import { BarChart3, ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import ReportExportBar from "@/components/reports/ReportExportBar";
import ReportDateFilter from "@/components/reports/ReportDateFilter";
import BranchPerformanceChart from "@/components/charts/BranchPerformanceChart";
import BranchReportDownloadButton from "@/components/reports/BranchReportDownloadButton";

export default async function BranchPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await auth();
  const user = session!.user as { id: string; role: string };

  if (user.role === "MANAGER") redirect("/dashboard");

  const { from, to } = await searchParams;

  const now = new Date();
  const defaultMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const periodStart = from ? new Date(from) : defaultMonthStart;
  const periodEnd = to ? new Date(new Date(to).setHours(23, 59, 59, 999)) : defaultMonthEnd;

  const monthLabel =
    from || to
      ? `${periodStart.toLocaleDateString()} – ${periodEnd.toLocaleDateString()}`
      : now.toLocaleString("default", { month: "long", year: "numeric" });

  const dateFilter = { gte: periodStart, lte: periodEnd };

  const isOwner = user.role === "OWNER";

  const stats = await withDbRetry(async () => {
    const branches = await prisma.branch.findMany({
      where: {
        isActive: true,
        ...(isOwner ? { ownerId: user.id } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return Promise.all(
      branches.map(async (b) => {
        const [rev, milk, exp] = await Promise.all([
          prisma.sale.aggregate({
            _sum: { revenue: true },
            where: { branchId: b.id, date: dateFilter },
          }),
          prisma.milkSupply.aggregate({
            _sum: { totalCost: true },
            where: { branchId: b.id, date: dateFilter },
          }),
          prisma.expense.aggregate({
            _sum: { amount: true },
            where: { branchId: b.id, date: dateFilter },
          }),
        ]);

        const revenue = Number(rev._sum.revenue ?? 0);
        const milkCost = Number(milk._sum.totalCost ?? 0);
        const expenses = Number(exp._sum.amount ?? 0);
        const grossProfit = revenue - milkCost;
        const netProfit = grossProfit - expenses;

        return { name: b.name, revenue, milkCost, expenses, grossProfit, netProfit };
      })
    );
  });

  const totals = stats.reduce(
    (acc, s) => ({
      revenue: acc.revenue + s.revenue,
      milkCost: acc.milkCost + s.milkCost,
      expenses: acc.expenses + s.expenses,
      grossProfit: acc.grossProfit + s.grossProfit,
      netProfit: acc.netProfit + s.netProfit,
    }),
    { revenue: 0, milkCost: 0, expenses: 0, grossProfit: 0, netProfit: 0 }
  );

  const csvRows = stats.map((s) => ({
    branch: s.name,
    revenue: s.revenue,
    milkCosts: s.milkCost,
    expenses: s.expenses,
    grossProfit: s.grossProfit,
    netProfit: s.netProfit,
  }));

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/reports"
        className="text-sm text-green-700 hover:underline flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Reports
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Branch Performance</h1>
            <p className="text-sm text-gray-400">{monthLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ReportExportBar
            reportTitle="Branch Performance Report"
            reportPeriod={monthLabel}
            csvFilename="branch-performance.csv"
            csvColumns={[
              { key: "branch", label: "Branch" },
              { key: "revenue", label: "Revenue (UGX)" },
              { key: "milkCosts", label: "Milk Costs (UGX)" },
              { key: "expenses", label: "Expenses (UGX)" },
              { key: "grossProfit", label: "Gross Profit (UGX)" },
              { key: "netProfit", label: "Net Profit (UGX)" },
            ]}
            csvRows={csvRows}
          />
          <BranchReportDownloadButton data={{ period: monthLabel, stats, totals }} />
        </div>
      </div>

      <Suspense>
        <ReportDateFilter from={from ?? ""} to={to ?? ""} />
      </Suspense>

      {/* Printable report content */}
      <div id="report-content" className="space-y-6">

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Revenue", value: totals.revenue, color: "text-gray-900" },
          { label: "Milk Costs", value: totals.milkCost, color: "text-gray-900" },
          { label: "Expenses", value: totals.expenses, color: "text-gray-900" },
          { label: "Gross Profit", value: totals.grossProfit, color: totals.grossProfit >= 0 ? "text-green-700" : "text-red-600" },
          { label: "Net Profit", value: totals.netProfit, color: totals.netProfit >= 0 ? "text-green-700" : "text-red-600" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{card.label}</p>
            <p className={`text-lg font-bold ${card.color}`}>
              UGX {card.value.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">All branches</p>
          </div>
        ))}
      </div>

      {/* Branch comparison chart */}
      {stats.length > 0 && <BranchPerformanceChart stats={stats} />}

      {/* Column legend */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">How columns are calculated</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1.5 text-xs text-gray-600">
          <div><span className="font-medium text-gray-800">Revenue</span> — total money received from milk sales at the branch within the selected period.</div>
          <div><span className="font-medium text-gray-800">Milk Costs</span> — total purchase cost paid to suppliers for all milk delivered to the branch.</div>
          <div><span className="font-medium text-gray-800">Expenses</span> — all recorded operational costs (salaries, rent, utilities, etc.) charged to the branch.</div>
          <div><span className="font-medium text-gray-800">Gross Profit</span> — Revenue minus Milk Costs. Shows how much is left after buying milk, before running expenses.</div>
          <div><span className="font-medium text-gray-800">Net Profit</span> — Gross Profit minus Expenses. The final bottom-line result for the branch in the period.</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Per-Branch Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Branch</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Revenue</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Milk Costs</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Expenses</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Gross Profit</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-xs">
                    No branches found
                  </td>
                </tr>
              ) : (
                stats.map((s) => (
                  <tr key={s.name} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      UGX {s.revenue.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      UGX {s.milkCost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      UGX {s.expenses.toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-medium ${s.grossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                      UGX {s.grossProfit.toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${s.netProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                      UGX {s.netProfit.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {stats.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-900 text-xs uppercase tracking-wide">Totals</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                    UGX {totals.revenue.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                    UGX {totals.milkCost.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                    UGX {totals.expenses.toLocaleString()}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${totals.grossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                    UGX {totals.grossProfit.toLocaleString()}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${totals.netProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                    UGX {totals.netProfit.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      </div>{/* end report-content */}
    </div>
  );
}

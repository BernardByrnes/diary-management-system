import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { PieChart, ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import ReportExportBar from "@/components/reports/ReportExportBar";
import ReportDateFilter from "@/components/reports/ReportDateFilter";
import MonthlyReportDownloadButton from "@/components/reports/MonthlyReportDownloadButton";
import type { MonthlyReportData } from "@/lib/utils/pdf-document";
import InsightsPanel, { type Insight } from "@/components/reports/InsightsPanel";
import { FinancialStorySummary } from "@/components/reports/FinancialStorySummary";
import type { FinancialStoryData } from "@/lib/utils/financial-story";
import BranchProfitBarChart from "@/components/charts/BranchProfitBarChart";
import ExpenseCategoryPieChart from "@/components/charts/ExpenseCategoryPieChart";

export default async function MonthlySummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await auth();
  const user = session!.user as { id: string; role: string };

  if (user.role !== "EXECUTIVE_DIRECTOR") redirect("/dashboard/reports");

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

  const [
    revenueAgg,
    milkCostAgg,
    expenseAgg,
    branches,
    allSupplies,
    allPayments,
    outstandingSupplierAdvances,
    outstandingOwnerAdvances,
    allExpenses,
  ] = await Promise.all([
    prisma.sale.aggregate({ _sum: { revenue: true }, where: { date: dateFilter } }),
    prisma.milkSupply.aggregate({ _sum: { totalCost: true }, where: { date: dateFilter } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { date: dateFilter } }),
    prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.milkSupply.findMany({
      where: { date: dateFilter },
      select: { supplierId: true, liters: true, totalCost: true, supplier: { select: { name: true } } },
    }),
    prisma.supplierPayment.findMany({
      where: {},
      select: { status: true, netAmount: true, grossAmount: true },
    }),
    prisma.advance.aggregate({
      _sum: { amount: true },
      where: { recipientType: "SUPPLIER", isDeducted: false },
    }),
    prisma.advance.aggregate({
      _sum: { amount: true },
      where: { recipientType: "OWNER", isDeducted: false },
    }),
    prisma.expense.findMany({
      where: { date: dateFilter },
      select: { category: true, amount: true },
    }),
  ]);

  const totalRevenue = Number(revenueAgg._sum.revenue ?? 0);
  const totalMilkCosts = Number(milkCostAgg._sum.totalCost ?? 0);
  const totalExpenses = Number(expenseAgg._sum.amount ?? 0);
  const netProfit = totalRevenue - totalMilkCosts - totalExpenses;

  // Previous period (same duration shifted back) for comparison
  const periodDuration = periodEnd.getTime() - periodStart.getTime();
  const prevEnd = new Date(periodStart.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - periodDuration);
  const prevDateFilter = { gte: prevStart, lte: prevEnd };

  const [prevRevenueAgg, prevMilkCostAgg, prevExpenseAgg] = await Promise.all([
    prisma.sale.aggregate({ _sum: { revenue: true }, where: { date: prevDateFilter } }),
    prisma.milkSupply.aggregate({ _sum: { totalCost: true }, where: { date: prevDateFilter } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { date: prevDateFilter } }),
  ]);

  const prevRevenue = Number(prevRevenueAgg._sum.revenue ?? 0);
  const prevMilkCosts = Number(prevMilkCostAgg._sum.totalCost ?? 0);
  const prevExpenses = Number(prevExpenseAgg._sum.amount ?? 0);
  const prevNetProfit = prevRevenue - prevMilkCosts - prevExpenses;

  const revDeltaPct = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : null;
  const milkCostDeltaPct = prevMilkCosts > 0 ? ((totalMilkCosts - prevMilkCosts) / prevMilkCosts) * 100 : null;
  const expenseDeltaPct = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : null;
  const profitDeltaPct = prevNetProfit !== 0 ? ((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100 : null;

  // Per-branch breakdown
  const branchStats = await Promise.all(
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
      const net = revenue - milkCost - expenses;
      return { name: b.name, revenue, milkCost, expenses, netProfit: net };
    })
  );

  // Top 5 suppliers by volume
  const supplierMap = new Map<string, { name: string; liters: number; cost: number }>();
  for (const s of allSupplies) {
    const existing = supplierMap.get(s.supplierId);
    if (existing) {
      existing.liters += Number(s.liters);
      existing.cost += Number(s.totalCost);
    } else {
      supplierMap.set(s.supplierId, {
        name: s.supplier.name,
        liters: Number(s.liters),
        cost: Number(s.totalCost),
      });
    }
  }
  const topSuppliers = Array.from(supplierMap.values())
    .sort((a, b) => b.liters - a.liters)
    .slice(0, 5);

  // Payment status summary
  const paymentSummary = {
    CALCULATED: { count: 0, total: 0 },
    APPROVED: { count: 0, total: 0 },
    PAID: { count: 0, total: 0 },
  };
  for (const p of allPayments) {
    const key = p.status as keyof typeof paymentSummary;
    if (paymentSummary[key]) {
      paymentSummary[key].count += 1;
      paymentSummary[key].total += Number(p.netAmount);
    }
  }

  // Expense category breakdown
  const categoryMap = new Map<string, number>();
  for (const e of allExpenses) {
    categoryMap.set(e.category, (categoryMap.get(e.category) ?? 0) + Number(e.amount));
  }
  const categoryBreakdown = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]);

  const outstandingSupplier = Number(outstandingSupplierAdvances._sum.amount ?? 0);
  const outstandingOwner = Number(outstandingOwnerAdvances._sum.amount ?? 0);

  // Smart insights
  const fmtS = (n: number) =>
    n >= 1_000_000
      ? `UGX ${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `UGX ${(n / 1_000).toFixed(0)}K`
      : `UGX ${n.toLocaleString()}`;

  const insights: Insight[] = [];

  if (revDeltaPct !== null) {
    if (revDeltaPct >= 10)
      insights.push({ type: "positive", title: `Revenue up ${revDeltaPct.toFixed(1)}%`, message: `Total revenue rose by ${fmtS(totalRevenue - prevRevenue)} compared to the previous equivalent period.` });
    else if (revDeltaPct <= -10)
      insights.push({ type: "danger", title: `Revenue down ${Math.abs(revDeltaPct).toFixed(1)}%`, message: `Revenue fell by ${fmtS(prevRevenue - totalRevenue)} vs the previous equivalent period. Investigate sales activity.` });
  }

  if (profitDeltaPct !== null && Math.abs(profitDeltaPct) >= 15) {
    if (profitDeltaPct <= -15 && prevNetProfit > 0)
      insights.push({ type: "warning", title: `Profit dropped ${Math.abs(profitDeltaPct).toFixed(1)}%`, message: `Net profit is ${fmtS(netProfit)} this period vs ${fmtS(prevNetProfit)} last period. Costs may be rising faster than revenue.` });
    else if (profitDeltaPct >= 15 && netProfit > 0)
      insights.push({ type: "positive", title: `Strong profit growth: +${profitDeltaPct.toFixed(1)}%`, message: `Net profit improved from ${fmtS(prevNetProfit)} to ${fmtS(netProfit)}.` });
  }

  const lossBranches = branchStats.filter((b) => b.netProfit < 0);
  if (lossBranches.length > 0) {
    const names = lossBranches.map((b) => b.name).join(", ");
    insights.push({ type: "danger", title: `${lossBranches.length} branch${lossBranches.length > 1 ? "es" : ""} running at a loss`, message: `${names} — revenue does not cover costs this period. Review expenses and sales activity.` });
  }

  if (totalRevenue > 0) {
    const expRatio = (totalExpenses / totalRevenue) * 100;
    if (expRatio > 65)
      insights.push({ type: "danger", title: `Expenses are ${expRatio.toFixed(0)}% of revenue`, message: `Very high operating expense ratio. Review major cost categories to protect margins.` });
    else if (expRatio > 50)
      insights.push({ type: "warning", title: `Expense ratio: ${expRatio.toFixed(0)}%`, message: `Expenses are consuming more than half of revenue. Monitor this closely.` });
  }

  if (branchStats.length >= 2) {
    const sorted = [...branchStats].sort((a, b) => b.netProfit - a.netProfit);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (best.netProfit > 0 && worst.netProfit >= 0)
      insights.push({ type: "info", title: `Top branch: ${best.name}`, message: `${best.name} leads with ${fmtS(best.netProfit)} net profit. ${worst.name} is the weakest at ${fmtS(worst.netProfit)}.` });
  }

  // Financial story data for summary generator
  const totalProfitForShares = branchStats.reduce((sum, b) => sum + (b.netProfit > 0 ? b.netProfit : 0), 0);
  const totalSupplierPayments = Object.values(paymentSummary).reduce((sum, s) => sum + s.total, 0);

  const storyData: FinancialStoryData = {
    period: {
      month: periodStart.toLocaleString("default", { month: "long" }),
      year: periodStart.getFullYear(),
    },
    totalRevenue,
    totalCosts: totalMilkCosts,
    totalExpenses,
    totalProfit: netProfit,
    branches: branchStats
      .filter((b) => b.netProfit > 0)
      .map((b) => ({
        name: b.name,
        revenue: b.revenue,
        profit: b.netProfit,
        profitShare:
          totalProfitForShares > 0
            ? (b.netProfit / totalProfitForShares) * 100
            : 0,
      })),
    lossBranches: branchStats
      .filter((b) => b.netProfit < 0)
      .map((b) => {
        let reason = "high costs";
        if (b.revenue === 0) reason = "no sales";
        else if (b.revenue > 0 && b.expenses / b.revenue > 0.8)
          reason = "high expense ratio";
        return { name: b.name, loss: Math.abs(b.netProfit), reason };
      }),
    payments: {
      totalSupplierPayments,
      outstandingAdvances: outstandingSupplier + outstandingOwner,
    },
  };

  const pdfData: MonthlyReportData = {
    period: monthLabel,
    totalRevenue,
    totalMilkCosts,
    totalExpenses,
    netProfit,
    branchStats,
    topSuppliers,
    paymentSummary,
    outstandingSupplier,
    outstandingOwner,
    categoryBreakdown: categoryBreakdown.map(([category, amount]) => ({ category, amount })),
  };

  const csvBranchRows = branchStats.map((b) => ({
    branch: b.name,
    revenue: b.revenue,
    milkCosts: b.milkCost,
    expenses: b.expenses,
    netProfit: b.netProfit,
    status: b.netProfit >= 0 ? "Profitable" : "Loss",
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
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <PieChart className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Monthly Summary</h1>
            <p className="text-sm text-gray-400">{monthLabel} · All branches</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ReportExportBar
            reportTitle="Monthly Summary Report"
            reportPeriod={monthLabel}
            csvFilename="monthly-summary.csv"
            csvColumns={[
              { key: "branch", label: "Branch" },
              { key: "revenue", label: "Revenue (UGX)" },
              { key: "milkCosts", label: "Milk Costs (UGX)" },
              { key: "expenses", label: "Expenses (UGX)" },
              { key: "netProfit", label: "Net Profit (UGX)" },
              { key: "status", label: "Status" },
            ]}
            csvRows={csvBranchRows}
          />
          <MonthlyReportDownloadButton data={pdfData} />
        </div>
      </div>

      <Suspense>
        <ReportDateFilter from={from ?? ""} to={to ?? ""} />
      </Suspense>

      {/* Financial Story Summary */}
      <FinancialStorySummary storyData={storyData} />

      <div id="report-content" className="space-y-6">

      {/* Top summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">UGX {totalRevenue.toLocaleString()}</p>
          {revDeltaPct !== null && (
            <p className={`text-xs font-medium mt-1.5 ${revDeltaPct >= 0 ? "text-green-600" : "text-red-500"}`}>
              {revDeltaPct >= 0 ? "▲" : "▼"} {Math.abs(revDeltaPct).toFixed(1)}% vs last period
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">This period</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Milk Costs</p>
          <p className="text-2xl font-bold text-gray-900">UGX {totalMilkCosts.toLocaleString()}</p>
          {milkCostDeltaPct !== null && (
            <p className={`text-xs font-medium mt-1.5 ${milkCostDeltaPct <= 0 ? "text-green-600" : "text-red-500"}`}>
              {milkCostDeltaPct >= 0 ? "▲" : "▼"} {Math.abs(milkCostDeltaPct).toFixed(1)}% vs last period
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">This period</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-gray-900">UGX {totalExpenses.toLocaleString()}</p>
          {expenseDeltaPct !== null && (
            <p className={`text-xs font-medium mt-1.5 ${expenseDeltaPct <= 0 ? "text-green-600" : "text-red-500"}`}>
              {expenseDeltaPct >= 0 ? "▲" : "▼"} {Math.abs(expenseDeltaPct).toFixed(1)}% vs last period
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">This period</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Net Profit</p>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
            UGX {netProfit.toLocaleString()}
          </p>
          {profitDeltaPct !== null && (
            <p className={`text-xs font-medium mt-1.5 ${profitDeltaPct >= 0 ? "text-green-600" : "text-red-500"}`}>
              {profitDeltaPct >= 0 ? "▲" : "▼"} {Math.abs(profitDeltaPct).toFixed(1)}% vs last period
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">Revenue − costs − expenses</p>
        </div>
      </div>

      {/* Smart Insights */}
      <InsightsPanel insights={insights} />

      {/* Per-branch table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Branch Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Branch</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Revenue</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Share</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Milk Costs</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Expenses</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Net Profit</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {branchStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-xs">
                    No branch data for this period
                  </td>
                </tr>
              ) : (
                branchStats.map((b) => (
                  <tr key={b.name} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      UGX {b.revenue.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {totalRevenue > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {((b.revenue / totalRevenue) * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      UGX {b.milkCost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      UGX {b.expenses.toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${b.netProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                      UGX {b.netProfit.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {b.netProfit >= 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Profitable
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Loss
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Branch net profit chart */}
      {branchStats.length > 0 && <BranchProfitBarChart branches={branchStats} />}

      {/* Two column section: Top Suppliers + Payment Status */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top 5 Suppliers */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Top 5 Suppliers by Volume</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Supplier</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Liters</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {topSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-400 text-xs">
                    No supply data this month
                  </td>
                </tr>
              ) : (
                topSuppliers.map((s, i) => (
                  <tr key={s.name} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 text-gray-700">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        {s.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      {s.liters.toLocaleString(undefined, { maximumFractionDigits: 1 })} L
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      UGX {s.cost.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Payment Status Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Payment Status Summary</h2>
          </div>
          <div className="p-5 space-y-4">
            {(["CALCULATED", "APPROVED", "PAID"] as const).map((status) => {
              const info = paymentSummary[status];
              const colorMap = {
                CALCULATED: { bg: "bg-gray-100", text: "text-gray-700", badge: "bg-gray-100 text-gray-600" },
                APPROVED: { bg: "bg-blue-50", text: "text-blue-700", badge: "bg-blue-100 text-blue-700" },
                PAID: { bg: "bg-green-50", text: "text-green-700", badge: "bg-green-100 text-green-700" },
              };
              const c = colorMap[status];
              return (
                <div key={status} className={`rounded-xl p-4 ${c.bg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.badge}`}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </span>
                    <span className="text-xs text-gray-500">{info.count} payments</span>
                  </div>
                  <p className={`text-lg font-bold ${c.text}`}>UGX {info.total.toLocaleString()}</p>
                </div>
              );
            })}

            <div className="pt-2 border-t border-gray-100 space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Outstanding Advances</h3>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Supplier advances</span>
                <span className="font-mono font-medium text-red-600">UGX {outstandingSupplier.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Owner advances</span>
                <span className="font-mono font-medium text-red-600">UGX {outstandingOwner.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-gray-100 pt-2">
                <span className="text-gray-900">Total outstanding</span>
                <span className="font-mono text-red-600">UGX {(outstandingSupplier + outstandingOwner).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expense category distribution */}
      {categoryBreakdown.length > 0 && (
        <ExpenseCategoryPieChart
          data={categoryBreakdown.map(([category, amount]) => ({ category, amount }))}
          total={totalExpenses}
        />
      )}

      </div>{/* end report-content */}
    </div>
  );
}

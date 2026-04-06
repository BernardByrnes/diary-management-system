import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { Scale, ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import ReportExportBar from "@/components/reports/ReportExportBar";
import ReportDateFilter from "@/components/reports/ReportDateFilter";

const RECONCILE_THRESHOLD = 5000;

export default async function ReconciliationPage({
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

  let branchFilter: { branchId?: { in: string[] } } = {};
  if (isOwner) {
    const owned = await prisma.branch.findMany({
      where: { ownerId: user.id },
      select: { id: true },
    });
    branchFilter = { branchId: { in: owned.map((b) => b.id) } };
  }

  const [deposits, sales, cashExpenses] = await Promise.all([
    prisma.bankDeposit.findMany({
      where: { date: dateFilter, ...branchFilter },
      include: { branch: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.sale.findMany({
      where: { date: dateFilter, ...branchFilter },
      select: { date: true, branchId: true, revenue: true },
    }),
    prisma.expense.findMany({
      where: { date: dateFilter, paymentMethod: "CASH", ...branchFilter },
      select: { date: true, branchId: true, amount: true },
    }),
  ]);

  // Build a map of branchId to branch name from deposits
  const branchNames = new Map<string, string>();
  for (const d of deposits) {
    branchNames.set(d.branchId, d.branch.name);
  }

  // Map keyed by "branchId|dateStr"
  type DayEntry = {
    branchId: string;
    branchName: string;
    dateStr: string;
    expectedDeposit: number;
    actualDeposit: number;
  };
  const dayMap = new Map<string, DayEntry>();

  function dateStr(d: Date) {
    return new Date(d).toISOString().slice(0, 10);
  }

  // Accumulate sales revenue
  for (const s of sales) {
    const key = `${s.branchId}|${dateStr(s.date)}`;
    const existing = dayMap.get(key);
    if (existing) {
      existing.expectedDeposit += Number(s.revenue);
    } else {
      dayMap.set(key, {
        branchId: s.branchId,
        branchName: branchNames.get(s.branchId) ?? s.branchId,
        dateStr: dateStr(s.date),
        expectedDeposit: Number(s.revenue),
        actualDeposit: 0,
      });
    }
  }

  // Subtract cash expenses from expected
  for (const e of cashExpenses) {
    const key = `${e.branchId}|${dateStr(e.date)}`;
    const existing = dayMap.get(key);
    if (existing) {
      existing.expectedDeposit -= Number(e.amount);
    } else {
      dayMap.set(key, {
        branchId: e.branchId,
        branchName: branchNames.get(e.branchId) ?? e.branchId,
        dateStr: dateStr(e.date),
        expectedDeposit: -Number(e.amount),
        actualDeposit: 0,
      });
    }
  }

  // Accumulate actual deposits
  for (const d of deposits) {
    const key = `${d.branchId}|${dateStr(d.date)}`;
    const existing = dayMap.get(key);
    if (existing) {
      existing.actualDeposit += Number(d.amount);
    } else {
      dayMap.set(key, {
        branchId: d.branchId,
        branchName: d.branch.name,
        dateStr: dateStr(d.date),
        expectedDeposit: 0,
        actualDeposit: Number(d.amount),
      });
    }
  }

  // Sort by date descending
  const rows = Array.from(dayMap.values()).sort((a, b) =>
    b.dateStr.localeCompare(a.dateStr)
  );

  // Summary calculations
  const totalExpected = rows.reduce((sum, r) => sum + r.expectedDeposit, 0);
  const totalActual = rows.reduce((sum, r) => sum + r.actualDeposit, 0);
  const discrepancyRows = rows.filter(
    (r) => Math.abs(r.actualDeposit - r.expectedDeposit) > RECONCILE_THRESHOLD
  );
  const totalDiscrepancy = discrepancyRows.reduce(
    (sum, r) => sum + Math.abs(r.actualDeposit - r.expectedDeposit),
    0
  );

  const csvRows = rows.map((r) => ({
    date: r.dateStr,
    branch: r.branchName,
    expectedDeposit: r.expectedDeposit,
    actualDeposit: r.actualDeposit,
    difference: r.actualDeposit - r.expectedDeposit,
    status: Math.abs(r.actualDeposit - r.expectedDeposit) > RECONCILE_THRESHOLD ? "Discrepancy" : "Reconciled",
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
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Scale className="w-5 h-5 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bank Reconciliation</h1>
            <p className="text-sm text-gray-400">{monthLabel} · Threshold: UGX {RECONCILE_THRESHOLD.toLocaleString()}</p>
          </div>
        </div>
        <ReportExportBar
          reportTitle="Bank Reconciliation Report"
          reportPeriod={monthLabel}
          csvFilename="reconciliation.csv"
          csvColumns={[
            { key: "date", label: "Date" },
            { key: "branch", label: "Branch" },
            { key: "expectedDeposit", label: "Expected Deposit (UGX)" },
            { key: "actualDeposit", label: "Actual Deposit (UGX)" },
            { key: "difference", label: "Difference (UGX)" },
            { key: "status", label: "Status" },
          ]}
          csvRows={csvRows}
        />
      </div>

      <Suspense>
        <ReportDateFilter from={from ?? ""} to={to ?? ""} />
      </Suspense>

      <div id="report-content" className="space-y-6">

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Expected</p>
          <p className="text-2xl font-bold text-gray-900">UGX {totalExpected.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Sales − cash expenses</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Deposited</p>
          <p className="text-2xl font-bold text-gray-900">UGX {totalActual.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Bank deposits recorded</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Discrepancy</p>
          <p className={`text-2xl font-bold ${totalDiscrepancy > 0 ? "text-red-600" : "text-green-700"}`}>
            UGX {totalDiscrepancy.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">Sum of |differences|</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Discrepancy Days</p>
          <p className={`text-2xl font-bold ${discrepancyRows.length > 0 ? "text-red-600" : "text-green-700"}`}>
            {discrepancyRows.length}
          </p>
          <p className="text-xs text-gray-400 mt-1">Days over threshold</p>
        </div>
      </div>

      {/* Reconciliation table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Daily Reconciliation</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Branch</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Expected</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Actual</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Difference</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-xs">
                    No data for this period
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const diff = r.actualDeposit - r.expectedDeposit;
                  const hasDiscrepancy = Math.abs(diff) > RECONCILE_THRESHOLD;
                  return (
                    <tr
                      key={`${r.branchId}-${r.dateStr}`}
                      className={hasDiscrepancy ? "bg-red-50/60 hover:bg-red-50" : "hover:bg-gray-50/70"}
                    >
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(r.dateStr).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{r.branchName}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        UGX {r.expectedDeposit.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        UGX {r.actualDeposit.toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-medium ${diff >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {diff >= 0 ? "+" : ""}UGX {diff.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {hasDiscrepancy ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            Discrepancy
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Reconciled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      </div>{/* end report-content */}
    </div>
  );
}

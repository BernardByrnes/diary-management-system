import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { Receipt, ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import ReportExportBar from "@/components/reports/ReportExportBar";
import ExpenseReportClient from "@/components/reports/ExpenseReportClient";
import ReportDateFilter from "@/components/reports/ReportDateFilter";

export default async function ExpenseReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user as { id: string; role: string };

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

  const expenses = await prisma.expense.findMany({
    where: { date: dateFilter, ...branchFilter },
    include: { branch: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const recordCount = expenses.length;

  // Category aggregation
  const categoryMap = new Map<string, number>();
  for (const e of expenses) {
    categoryMap.set(e.category, (categoryMap.get(e.category) ?? 0) + Number(e.amount));
  }
  const categoryBreakdown = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1]);

  const largestCategory = categoryBreakdown[0]?.[0] ?? "—";
  const maxCategoryTotal = categoryBreakdown[0]?.[1] ?? 0;

  const csvRows = expenses.map((e) => ({
    date: new Date(e.date).toLocaleDateString(),
    branch: e.branch.name,
    category: e.category,
    description: e.description,
    amount: Number(e.amount),
    paymentMethod: e.paymentMethod,
  }));

  const clientExpenses = expenses.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    branchName: e.branch.name,
    category: e.category,
    description: e.description,
    amount: Number(e.amount),
    paymentMethod: e.paymentMethod,
    isFlagged: e.isFlagged,
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
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-red-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expense Report</h1>
            <p className="text-sm text-gray-400">{monthLabel}</p>
          </div>
        </div>
        <ReportExportBar
          reportTitle="Expense Report"
          reportPeriod={monthLabel}
          csvFilename="expense-report.csv"
          csvColumns={[
            { key: "date", label: "Date" },
            { key: "branch", label: "Branch" },
            { key: "category", label: "Category" },
            { key: "description", label: "Description" },
            { key: "amount", label: "Amount (UGX)" },
            { key: "paymentMethod", label: "Payment Method" },
          ]}
          csvRows={csvRows}
        />
      </div>

      <Suspense>
        <ReportDateFilter from={from ?? ""} to={to ?? ""} />
      </Suspense>

      <div id="report-content" className="space-y-6">

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-gray-900">UGX {totalExpenses.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">This month</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Largest Category</p>
          <p className="text-2xl font-bold text-red-600 capitalize">{largestCategory.toLowerCase()}</p>
          <p className="text-xs text-gray-400 mt-1">
            {maxCategoryTotal > 0 ? `UGX ${maxCategoryTotal.toLocaleString()}` : "No expenses"}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Records</p>
          <p className="text-2xl font-bold text-gray-900">{recordCount}</p>
          <p className="text-xs text-gray-400 mt-1">Expense entries this month</p>
        </div>
      </div>

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Category Breakdown</h2>
          <div className="space-y-3">
            {categoryBreakdown.map(([category, total]) => {
              const pct = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0;
              return (
                <div key={category} className="flex items-center gap-3">
                  <span className="w-28 text-xs text-gray-600 capitalize">{category.toLowerCase()}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                  <span className="text-xs font-mono text-gray-700 w-36 text-right">
                    UGX {total.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expenses table — client component (supports flag for owners) */}
      <ExpenseReportClient
        expenses={clientExpenses}
        isOwner={isOwner}
        totalExpenses={totalExpenses}
      />

      </div>{/* end report-content */}
    </div>
  );
}

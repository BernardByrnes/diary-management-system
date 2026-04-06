import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { prisma, withDbRetry } from "@/lib/db/prisma";
import {
  BarChart3,
  Droplets,
  ShoppingCart,
  Receipt,
  Building2,
  CalendarCheck,
  Scale,
  PieChart,
} from "lucide-react";

export default async function ReportsPage() {
  const session = await auth();
  const user = session!.user as { id: string; role: string };

  if (user.role === "MANAGER") redirect("/dashboard");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const {
    milkStats,
    salesStats,
    expenseStats,
    activeBranchCount,
    pendingTransferCount,
    recentSupplies,
    recentSales,
  } = await withDbRetry(async () => {
    let branchIds: string[] | null = null;
    if (user.role === "OWNER") {
      const owned = await prisma.branch.findMany({
        where: { ownerId: user.id },
        select: { id: true },
      });
      branchIds = owned.map((b) => b.id);
    }

    const branchFilter = branchIds ? { branchId: { in: branchIds } } : {};

    const [
      milkStats,
      salesStats,
      expenseStats,
      activeBranchCount,
      pendingTransferCount,
      recentSupplies,
      recentSales,
    ] = await Promise.all([
      prisma.milkSupply.aggregate({
        _sum: { liters: true },
        where: { date: { gte: monthStart }, ...branchFilter },
      }),
      prisma.sale.aggregate({
        _sum: { revenue: true },
        where: { date: { gte: monthStart }, ...branchFilter },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { date: { gte: monthStart }, ...branchFilter },
      }),
      prisma.branch.count({ where: { isActive: true } }),
      prisma.milkTransfer.count({ where: { status: "PENDING" } }),
      prisma.milkSupply.findMany({
        where: branchFilter,
        orderBy: { date: "desc" },
        take: 10,
        include: {
          branch: { select: { name: true } },
          supplier: { select: { name: true } },
        },
      }),
      prisma.sale.findMany({
        where: branchFilter,
        orderBy: { date: "desc" },
        take: 10,
        include: { branch: { select: { name: true } } },
      }),
    ]);

    return {
      milkStats,
      salesStats,
      expenseStats,
      activeBranchCount,
      pendingTransferCount,
      recentSupplies,
      recentSales,
    };
  });

  const totalLiters = milkStats._sum.liters ? Number(milkStats._sum.liters) : 0;
  const totalRevenue = salesStats._sum.revenue ? Number(salesStats._sum.revenue) : 0;
  const totalExpenses = expenseStats._sum.amount ? Number(expenseStats._sum.amount) : 0;
  const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });

  const isED = user.role === "EXECUTIVE_DIRECTOR";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-400">Summary for {monthLabel}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4 text-teal-600" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Milk Collected</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {totalLiters.toLocaleString(undefined, { maximumFractionDigits: 1 })} L
          </p>
          <p className="text-xs text-gray-400 mt-1">This month</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-4 h-4 text-orange-600" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Revenue</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">UGX {totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">This month</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-red-600" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expenses</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">UGX {totalExpenses.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">This month</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-green-600" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {isED ? "Active Branches" : "Pending Transfers"}
            </p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {isED ? activeBranchCount : pendingTransferCount}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isED ? "Total active" : "Awaiting approval"}
          </p>
        </div>
      </div>

      {/* Report Links */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Detailed Reports</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Branch Performance */}
          <Link
            href="/dashboard/reports/branch-performance"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-green-200 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
              <BarChart3 className="w-5 h-5 text-green-700" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">Branch Performance</h3>
            <p className="text-xs text-gray-400 mt-1">Revenue, costs &amp; profit by branch</p>
            <span className="text-xs text-green-700 font-medium mt-3 inline-block">View Report →</span>
          </Link>

          {/* Supplier Payments */}
          <Link
            href="/dashboard/reports/supplier-payments"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
              <CalendarCheck className="w-5 h-5 text-blue-700" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">Supplier Payments</h3>
            <p className="text-xs text-gray-400 mt-1">Payment status &amp; advance deductions</p>
            <span className="text-xs text-blue-700 font-medium mt-3 inline-block">View Report →</span>
          </Link>

          {/* Expense Report */}
          <Link
            href="/dashboard/reports/expenses"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-red-200 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center mb-3 group-hover:bg-red-200 transition-colors">
              <Receipt className="w-5 h-5 text-red-700" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">Expense Report</h3>
            <p className="text-xs text-gray-400 mt-1">Spending by category &amp; branch</p>
            <span className="text-xs text-red-700 font-medium mt-3 inline-block">View Report →</span>
          </Link>

          {/* Reconciliation */}
          <Link
            href="/dashboard/reports/reconciliation"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-indigo-200 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center mb-3 group-hover:bg-indigo-200 transition-colors">
              <Scale className="w-5 h-5 text-indigo-700" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">Reconciliation</h3>
            <p className="text-xs text-gray-400 mt-1">Bank deposits vs. expected</p>
            <span className="text-xs text-indigo-700 font-medium mt-3 inline-block">View Report →</span>
          </Link>

          {/* Monthly Summary — ED only */}
          {isED && (
            <Link
              href="/dashboard/reports/monthly"
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-purple-200 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                <PieChart className="w-5 h-5 text-purple-700" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">Monthly Summary</h3>
              <p className="text-xs text-gray-400 mt-1">Full organisation overview</p>
              <span className="text-xs text-purple-700 font-medium mt-3 inline-block">View Report →</span>
            </Link>
          )}
        </div>
      </div>

      {/* Recent Activity Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Milk Supply */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Recent Milk Supply</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Branch</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Supplier</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Liters</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentSupplies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-xs">
                    No records this month
                  </td>
                </tr>
              ) : (
                recentSupplies.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 text-gray-600">{new Date(s.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{s.branch.name}</td>
                    <td className="px-4 py-3 text-gray-500">{s.supplier.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{Number(s.liters).toFixed(1)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Recent Sales */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Recent Sales</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Branch</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Liters</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-xs">
                    No records this month
                  </td>
                </tr>
              ) : (
                recentSales.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 text-gray-600">{new Date(s.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{s.branch.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{Number(s.litersSold).toFixed(1)}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">UGX {Number(s.revenue).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

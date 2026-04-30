import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { CalendarCheck, ChevronLeft } from "lucide-react";
import ReportExportBar from "@/components/reports/ReportExportBar";

export default async function SupplierPaymentsReportPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user as { id: string; role: string };

  if (user.role !== "EXECUTIVE_DIRECTOR") redirect("/dashboard/reports");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });

  const [payments, outstandingAdvances] = await Promise.all([
    prisma.supplierPayment.findMany({
      include: { supplier: { select: { name: true } } },
      orderBy: { scheduledDate: "desc" },
      take: 100,
    }),
    prisma.advance.aggregate({
      _sum: { amount: true },
      where: { recipientType: "SUPPLIER", isDeducted: false },
    }),
  ]);

  const paidThisMonth = payments
    .filter((p) => p.status === "PAID" && p.paidAt && new Date(p.paidAt) >= monthStart)
    .reduce((sum, p) => sum + Number(p.netAmount), 0);

  const totalPending = payments
    .filter((p) => p.status !== "PAID")
    .reduce((sum, p) => sum + Number(p.netAmount), 0);

  const outstandingTotal = Number(outstandingAdvances._sum.amount ?? 0);

  const statusCounts = {
    CALCULATED: payments.filter((p) => p.status === "CALCULATED").length,
    APPROVED: payments.filter((p) => p.status === "APPROVED").length,
    PAID: payments.filter((p) => p.status === "PAID").length,
  };

  function statusBadge(status: string) {
    if (status === "PAID")
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          Paid
        </span>
      );
    if (status === "APPROVED")
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          Approved
        </span>
      );
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        Calculated
      </span>
    );
  }

  const csvRows = payments.map((p) => ({
    supplier: p.supplier.name,
    periodStart: new Date(p.periodStart).toLocaleDateString(),
    periodEnd: new Date(p.periodEnd).toLocaleDateString(),
    grossAmount: Number(p.grossAmount),
    advanceDeductions: Number(p.advanceDeductions),
    netAmount: Number(p.netAmount),
    scheduledDate: new Date(p.scheduledDate ?? p.periodEnd).toLocaleDateString(),
    status: p.status,
    paidAt: p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "",
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
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Supplier Payments</h1>
            <p className="text-sm text-gray-400">{monthLabel} · All time records shown</p>
          </div>
        </div>
        <ReportExportBar
          reportTitle="Supplier Payments Report"
          reportPeriod={monthLabel}
          csvFilename="supplier-payments.csv"
          csvColumns={[
            { key: "supplier", label: "Supplier" },
            { key: "periodStart", label: "Period Start" },
            { key: "periodEnd", label: "Period End" },
            { key: "grossAmount", label: "Gross Amount (UGX)" },
            { key: "advanceDeductions", label: "Advance Deductions (UGX)" },
            { key: "netAmount", label: "Net Amount (UGX)" },
            { key: "scheduledDate", label: "Scheduled Date" },
            { key: "status", label: "Status" },
            { key: "paidAt", label: "Paid At" },
          ]}
          csvRows={csvRows}
        />
      </div>

      <div id="report-content" className="space-y-6">

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Paid This Month</p>
          <p className="text-2xl font-bold text-green-700">UGX {paidThisMonth.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">{statusCounts.PAID} payments completed</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Pending</p>
          <p className="text-2xl font-bold text-orange-600">UGX {totalPending.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">
            {statusCounts.CALCULATED} calculated · {statusCounts.APPROVED} approved
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Outstanding Advances</p>
          <p className="text-2xl font-bold text-red-600">UGX {outstandingTotal.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Not yet deducted</p>
        </div>
      </div>

      {/* Payments table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">All Supplier Payments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Supplier</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Period</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Gross Amount</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Deductions</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Net Amount</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Scheduled</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Paid At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-xs">
                    No supplier payments found
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.supplier.name}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(p.periodStart).toLocaleDateString()} – {new Date(p.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      UGX {Number(p.grossAmount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-red-600">
                      {Number(p.advanceDeductions) > 0
                        ? `− UGX ${Number(p.advanceDeductions).toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                      UGX {Number(p.netAmount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(p.scheduledDate ?? p.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">{statusBadge(p.status)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      </div>{/* end report-content */}
    </div>
  );
}

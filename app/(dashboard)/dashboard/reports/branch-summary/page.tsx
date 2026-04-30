import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma, withDbRetry } from "@/lib/db/prisma";
import { ChevronLeft, Building2 } from "lucide-react";
import BranchSummaryFilters from "@/components/reports/BranchSummaryFilters";
import { BranchSummaryNavProvider } from "@/components/reports/BranchSummaryNavContext";
import BranchSummaryDownloadButton from "@/components/reports/BranchSummaryDownloadButton";
import ShareReportButton from "@/components/reports/ShareReportButton";
import { loadBranchSummaryReportData } from "@/lib/utils/branch-summary-report";

export default async function BranchSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; from?: string; to?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user as { id: string; role: string };

  if (user.role === "MANAGER") {
    redirect("/dashboard");
  }

  const { branchId: branchIdParam, from, to } = await searchParams;

  const now = new Date();
  const defaultMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const periodStart = from ? new Date(from) : defaultMonthStart;
  const periodEnd = to ? new Date(new Date(to).setHours(23, 59, 59, 999)) : defaultMonthEnd;

  const isOwner = user.role === "OWNER";
  const isEd = user.role === "EXECUTIVE_DIRECTOR";

  const branches = await withDbRetry(() =>
    prisma.branch.findMany({
      where: {
        isActive: true,
        ...(isOwner ? { ownerId: user.id } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
  );

  if (branches.length === 0) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/reports"
          className="text-sm text-green-700 hover:underline flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Reports
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-500">
          No branches available for this report.
        </div>
      </div>
    );
  }

  const branchId = branchIdParam && branches.some((b) => b.id === branchIdParam)
    ? branchIdParam
    : branches[0].id;

  if (branchIdParam && branchIdParam !== branchId) {
    notFound();
  }

  const data = await withDbRetry(() =>
    loadBranchSummaryReportData(branchId, periodStart, periodEnd)
  );

  const monthLabel =
    from || to
      ? `${periodStart.toLocaleDateString()} – ${periodEnd.toLocaleDateString()}`
      : now.toLocaleString("default", { month: "long", year: "numeric" });

  const f = data.financials;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/reports"
        className="text-sm text-green-700 hover:underline flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Reports
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Branch Summary</h1>
            <p className="text-sm text-gray-400">{monthLabel}</p>
          </div>
        </div>
        <BranchSummaryDownloadButton data={data} />
          {isEd && (
            <ShareReportButton
              branchId={branchId}
              branchName={data.branch.name}
              periodLabel={monthLabel}
              from={from}
              to={to}
              ownerName={data.owner.fullName}
              managerNames={data.managers.map((m) => m.fullName)}
            />
          )}
      </div>

      <BranchSummaryNavProvider>
        <BranchSummaryFilters
          key={`${branchId}:${from ?? ""}:${to ?? ""}`}
          branches={branches}
          branchId={branchId}
          from={from ?? ""}
          to={to ?? ""}
        />

        <p className="text-sm text-gray-600 max-w-3xl">
          Comprehensive snapshot for one branch — financials, volumes, suppliers, expenses, banking,
          transfers, and key operational signals. Export the PDF to share with the branch owner.
        </p>

        {/* Padding on each cell guarantees visible gutters even if CSS `gap` is stripped/overridden */}
        <div className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Revenue", value: f.revenue, color: "text-gray-900" },
            { label: "Milk costs", value: f.milkCost, color: "text-gray-900" },
            { label: "Expenses", value: f.expenses, color: "text-gray-900" },
            {
              label: "Gross profit",
              value: f.grossProfit,
              color: f.grossProfit >= 0 ? "text-green-700" : "text-red-600",
            },
            {
              label: "Net profit",
              value: f.netProfit,
              color: f.netProfit >= 0 ? "text-green-700" : "text-red-600",
            },
          ].map((card) => (
            <div key={card.label} className="min-w-0 p-2 sm:p-2.5">
              <div className="h-full min-h-28 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  {card.label}
                </p>
                <p className={`text-lg font-bold ${card.color}`}>
                  UGX {card.value.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">{data.branch.name}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid w-full grid-cols-1 md:grid-cols-2">
          <div className="min-w-0 p-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 text-sm mb-3">Volumes</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Milk received</dt>
                  <dd className="font-mono text-gray-900">
                    {data.volumes.milkLitersIn.toLocaleString(undefined, { maximumFractionDigits: 1 })} L
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Milk sold</dt>
                  <dd className="font-mono text-gray-900">
                    {data.volumes.milkLitersSold.toLocaleString(undefined, { maximumFractionDigits: 1 })} L
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="min-w-0 p-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 text-sm mb-3">Banking (period)</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Deposits</dt>
                  <dd className="font-mono text-gray-900">{data.banking.depositCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Total deposited</dt>
                  <dd className="font-mono text-gray-900">
                    UGX {data.banking.totalDeposited.toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">With discrepancy</dt>
                  <dd
                    className={`font-mono ${data.banking.discrepancyCount > 0 ? "text-red-600" : "text-gray-900"}`}
                  >
                    {data.banking.discrepancyCount}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </BranchSummaryNavProvider>
    </div>
  );
}

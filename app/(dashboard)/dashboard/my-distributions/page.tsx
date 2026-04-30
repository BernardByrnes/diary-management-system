import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { PieChart } from "lucide-react";

export default async function MyDistributionsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user as { id: string; role: string };

  if (user.role !== "OWNER") redirect("/dashboard");

  const distributions = await prisma.profitDistribution.findMany({
    where: { ownerId: user.id },
    include: { branch: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const totalPaidOut = distributions
    .filter((d) => d.status === "PAID")
    .reduce((sum, d) => sum + Number(d.netPayout), 0);

  const latest = distributions[0] ?? null;

  const statusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
            Paid
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
            Approved
          </span>
        );
      default:
        return (
          <span className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
            Calculated
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
          <PieChart className="w-5 h-5 text-rose-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Distributions</h1>
          <p className="text-sm text-gray-400">
            {distributions.length} distribution{distributions.length !== 1 ? "s" : ""} on record
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Total Distributions
          </p>
          <p className="text-2xl font-bold text-gray-900">{distributions.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Total Paid Out
          </p>
          <p className="text-2xl font-bold text-green-700">
            UGX {totalPaidOut.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Latest Distribution
          </p>
          {latest ? (
            <>
              <p className="text-2xl font-bold text-gray-900">
                UGX {Number(latest.netPayout).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(latest.createdAt).toLocaleDateString()}
              </p>
            </>
          ) : (
            <p className="text-2xl font-bold text-gray-300">—</p>
          )}
        </div>
      </div>

      {/* Table */}
      {distributions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
          No distributions recorded yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Period
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Branch
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Revenue
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Gross Profit
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Deductions
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Net Payout
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Approved At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {distributions.map((d) => {
                  const netPayout = Number(d.netPayout);
                  const deductions =
                    Number(d.totalExpenses) +
                    Number(d.totalMilkCosts) +
                    Number(d.advanceDeductions ?? 0);
                  const grossProfit = Number(d.grossProfit ?? 0);
                  const revenue = Number(d.totalRevenue);

                  return (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                        <span>
                          {new Date(d.periodStart).toLocaleDateString()} –{" "}
                          {new Date(d.periodEnd).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700 font-medium whitespace-nowrap">
                        {d.branch.name}
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-900 whitespace-nowrap">
                        UGX {revenue.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-900 whitespace-nowrap">
                        UGX {grossProfit.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-900 whitespace-nowrap">
                        UGX {deductions.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <span
                          className={
                            netPayout > 0
                              ? "font-semibold text-green-700"
                              : "font-semibold text-amber-600"
                          }
                        >
                          UGX {netPayout.toLocaleString()}
                        </span>
                        <p className="text-xs text-gray-400 mt-0.5 font-normal">
                          Revenue - Milk Costs - Expenses - Advances = Net Payout
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-center">{statusBadge(d.status)}</td>
                      <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                        {d.approvedAt
                          ? new Date(d.approvedAt).toLocaleDateString()
                          : <span className="text-gray-300 italic">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

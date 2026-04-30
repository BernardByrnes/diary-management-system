import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { Building2 } from "lucide-react";
import { getBranchAvailableLiters } from "@/lib/utils/stock";

/** Data loader (not a React component) — keeps request-scoped date math out of the page component for react-hooks/purity. */
async function getBranchesForOwner(ownerId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return prisma.branch.findMany({
    where: { ownerId },
    include: {
      managers: {
        include: { manager: { select: { id: true, fullName: true } } },
      },
      milkSupplies: {
        where: { date: { gte: sevenDaysAgo } },
        orderBy: { date: "desc" },
        take: 5,
        include: { supplier: { select: { name: true } } },
      },
      sales: {
        where: { date: { gte: sevenDaysAgo } },
        orderBy: { date: "desc" },
        take: 5,
      },
    },
  });
}

export default async function MyBranchesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user as { id: string; role: string };

  if (user.role !== "OWNER") redirect("/dashboard");

  const branches = await getBranchesForOwner(user.id);

  // Compute current stock balance for each branch in parallel
  const stockBalances = await Promise.all(
    branches.map((b) => getBranchAvailableLiters(b.id))
  );
  const stockByBranchId = Object.fromEntries(
    branches.map((b, i) => [b.id, stockBalances[i]])
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-green-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Branches</h1>
          <p className="text-sm text-gray-400">
            {branches.length} branch{branches.length !== 1 ? "es" : ""} under your ownership
          </p>
        </div>
      </div>

      {branches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
          No branches assigned to you yet.
        </div>
      ) : (
        <div className="space-y-5">
          {branches.map((branch) => (
            <div key={branch.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{branch.name}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{branch.location}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      branch.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {branch.isActive ? "Active" : "Inactive"}
                  </span>
                  <Link
                    href={`/dashboard/reports/branch-performance?branchId=${branch.id}`}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-green-700 text-white hover:bg-green-800 transition-colors whitespace-nowrap"
                  >
                    View Report →
                  </Link>
                </div>
              </div>

              {/* Stock balance pill */}
              <div className="mb-5 flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Est. Stock Balance:</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    stockByBranchId[branch.id] >= 0
                      ? "bg-teal-50 text-teal-700"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {stockByBranchId[branch.id].toFixed(1)} L
                </span>
              </div>

              {branch.managers.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Managers
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {branch.managers.map((m) => (
                      <span
                        key={m.id}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg"
                      >
                        {m.manager.fullName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-5">
                {/* Recent Milk Supply */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Milk Supply (last 7 days)
                  </p>
                  {branch.milkSupplies.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No records in the past 7 days</p>
                  ) : (
                    <div className="space-y-1.5">
                      {branch.milkSupplies.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-gray-500">
                            {new Date(s.date).toLocaleDateString()}
                          </span>
                          <span className="text-gray-700 font-medium">
                            {Number(s.liters).toFixed(1)} L —{" "}
                            <span className="text-gray-500">{s.supplier.name}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Sales */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Sales (last 7 days)
                  </p>
                  {branch.sales.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No records in the past 7 days</p>
                  ) : (
                    <div className="space-y-1.5">
                      {branch.sales.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-gray-500">
                            {new Date(s.date).toLocaleDateString()}
                          </span>
                          <span className="text-gray-700 font-medium">
                            {Number(s.litersSold).toFixed(1)} L —{" "}
                            <span className="text-teal-700">
                              UGX {Number(s.revenue).toLocaleString()}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

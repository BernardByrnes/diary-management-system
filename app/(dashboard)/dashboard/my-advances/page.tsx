import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { Wallet } from "lucide-react";

export default async function MyAdvancesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user as { id: string; role: string };

  if (user.role !== "OWNER") redirect("/dashboard");

  const advances = await prisma.advance.findMany({
    where: { ownerId: user.id, recipientType: "OWNER" },
    orderBy: { date: "desc" },
  });

  const outstanding = advances
    .filter((a) => !a.isDeducted)
    .reduce((sum, a) => sum + Number(a.amount), 0);
  const deducted = advances
    .filter((a) => a.isDeducted)
    .reduce((sum, a) => sum + Number(a.amount), 0);
  const total = outstanding + deducted;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Advances</h1>
          <p className="text-sm text-gray-400">
            {advances.length} advance{advances.length !== 1 ? "s" : ""} on record
          </p>
        </div>
      </div>

      {/* Outstanding balance note */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-sm text-amber-800 font-medium">
        Your current outstanding advance balance is{" "}
        <span className="font-bold">UGX {outstanding.toLocaleString()}</span>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Total Advances Received
          </p>
          <p className="text-2xl font-bold text-gray-900">
            UGX {total.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Outstanding Balance
          </p>
          <p className="text-2xl font-bold text-amber-700">
            UGX {outstanding.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Total Deducted
          </p>
          <p className="text-2xl font-bold text-green-700">
            UGX {deducted.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Table */}
      {advances.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
          No advances recorded yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Purpose
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Deducted At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {advances.map((advance) => (
                  <tr key={advance.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                      {new Date(advance.date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">
                      {advance.purpose ?? <span className="text-gray-400 italic">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-gray-900 whitespace-nowrap">
                      UGX {Number(advance.amount).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {advance.isDeducted ? (
                        <span className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          Deducted
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                          Outstanding
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                      {advance.deductedAt
                        ? new Date(advance.deductedAt).toLocaleDateString()
                        : <span className="text-gray-300 italic">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

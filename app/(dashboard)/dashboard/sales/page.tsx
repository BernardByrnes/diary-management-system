import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { ShoppingCart } from "lucide-react";
import SalesClient from "@/components/sales/SalesClient";
import { getFifoStateForBranch } from "@/lib/utils/fifo";

export default async function SalesPage() {
  const session = await auth();
  const user = session!.user as { id: string; role: string };

  if (user.role === "OWNER") {
    redirect("/dashboard");
  }

  if (!["EXECUTIVE_DIRECTOR", "MANAGER"].includes(user.role)) {
    redirect("/dashboard");
  }

  let managedBranchIds: string[] = [];
  if (user.role === "MANAGER") {
    const managed = await prisma.branchManager.findMany({
      where: { managerId: user.id },
      select: { branchId: true },
    });
    managedBranchIds = managed.map((b) => b.branchId);
  }

  const salesWhere =
    user.role === "MANAGER"
      ? { branchId: { in: managedBranchIds } }
      : {};

  const branchesWhere =
    user.role === "MANAGER"
      ? { id: { in: managedBranchIds }, isActive: true }
      : { isActive: true };

  const branches = await prisma.branch.findMany({
    where: branchesWhere,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const [sales, fifoPrices] = await Promise.all([
    prisma.sale.findMany({
      where: salesWhere,
      include: {
        branch: { select: { id: true, name: true } },
        recordedBy: { select: { id: true, fullName: true } },
        milkSupply: { select: { id: true, date: true } },
      },
      orderBy: { date: "desc" },
      take: 200,
    }),
    Promise.all(branches.map(async (b) => {
      const fifo = await getFifoStateForBranch(b.id);
      return { branchId: b.id, retailPricePerLiter: fifo.retailPricePerLiter };
    })),
  ]);

  const serializedRecords = sales.map((s) => ({
    id: s.id,
    date: s.date.toISOString(),
    litersSold: s.litersSold.toString(),
    pricePerLiter: s.pricePerLiter.toString(),
    revenue: s.revenue.toString(),
    branch: s.branch,
    recordedBy: s.recordedBy,
    createdAt: s.createdAt.toISOString(),
    milkSupplyId: s.milkSupplyId,
    milkSupply: s.milkSupply
      ? {
          id: s.milkSupply.id,
          date:
            typeof s.milkSupply.date === "string"
              ? s.milkSupply.date
              : s.milkSupply.date.toISOString(),
        }
      : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
          <ShoppingCart className="w-5 h-5 text-orange-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-sm text-gray-400">
            {sales.length} record{sales.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <SalesClient
        initialRecords={serializedRecords}
        branchOptions={branches}
        fifoPriceByBranch={fifoPrices}
        userRole={user.role}
        managedBranchIds={managedBranchIds}
      />
    </div>
  );
}

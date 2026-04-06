import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { ShoppingCart } from "lucide-react";
import SalesClient from "@/components/sales/SalesClient";

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

  const [sales, deliveryChunks] = await Promise.all([
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
    Promise.all(
      branches.map((b) =>
        prisma.milkSupply.findMany({
          where: { branchId: b.id },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          take: 20,
          select: {
            id: true,
            branchId: true,
            date: true,
            liters: true,
            costPerLiter: true,
            retailPricePerLiter: true,
          },
        })
      )
    ),
  ]);

  const deliveryRows = deliveryChunks.flat();

  const latestPurchaseCostByBranch = await Promise.all(
    branches.map(async (b) => {
      const last = await prisma.milkSupply.findFirst({
        where: { branchId: b.id },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        select: { costPerLiter: true, date: true, retailPricePerLiter: true },
      });
      if (!last) {
        return {
          branchId: b.id,
          costPerLiter: 0,
          date: "",
          retailPricePerLiter: null as number | null,
        };
      }
      return {
        branchId: b.id,
        costPerLiter: Number(last.costPerLiter),
        date: last.date.toISOString(),
        retailPricePerLiter:
          last.retailPricePerLiter != null
            ? Number(last.retailPricePerLiter)
            : null,
      };
    })
  );

  const deliveryOptions = deliveryRows.map((r) => ({
    id: r.id,
    branchId: r.branchId,
    date: r.date.toISOString(),
    liters: r.liters.toString(),
    costPerLiter: r.costPerLiter.toString(),
    retailPricePerLiter:
      r.retailPricePerLiter != null ? r.retailPricePerLiter.toString() : null,
  }));

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
        latestPurchaseCostByBranch={latestPurchaseCostByBranch.filter(
          (x) => x.date !== ""
        )}
        deliveryOptions={deliveryOptions}
        userRole={user.role}
        managedBranchIds={managedBranchIds}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { Droplets } from "lucide-react";
import MilkSupplyClient from "@/components/milk-supply/MilkSupplyClient";

export default async function MilkSupplyPage() {
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

  const milkSupplyWhere =
    user.role === "MANAGER"
      ? { branchId: { in: managedBranchIds } }
      : {};

  const branchesWhere =
    user.role === "MANAGER"
      ? { id: { in: managedBranchIds }, isActive: true }
      : { isActive: true };

  const [milkSupplies, branches, suppliers] = await Promise.all([
    prisma.milkSupply.findMany({
      where: milkSupplyWhere,
      include: {
        branch: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        recordedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { date: "desc" },
      take: 200,
    }),
    prisma.branch.findMany({
      where: branchesWhere,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedRecords = milkSupplies.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    liters: r.liters.toString(),
    costPerLiter: r.costPerLiter.toString(),
    totalCost: r.totalCost.toString(),
    retailPricePerLiter:
      r.retailPricePerLiter != null ? r.retailPricePerLiter.toString() : "",
    deliveryReference: r.deliveryReference,
    branch: r.branch,
    supplier: r.supplier,
    recordedBy: r.recordedBy,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <Droplets className="w-5 h-5 text-teal-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Milk Supply</h1>
          <p className="text-sm text-gray-400">
            {milkSupplies.length} record{milkSupplies.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <MilkSupplyClient
        initialRecords={serializedRecords}
        branchOptions={branches}
        supplierOptions={suppliers}
        userRole={user.role}
        managedBranchIds={managedBranchIds}
      />
    </div>
  );
}

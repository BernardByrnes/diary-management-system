import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { PackageSearch } from "lucide-react";
import StockSnapshotsClient from "@/components/stock-snapshots/StockSnapshotsClient";
import { getBranchAvailableLiters } from "@/lib/utils/stock";

export default async function StockSnapshotsPage() {
  const session = await auth();
  const user = session!.user as { id: string; role: string };

  const isED = user.role === "EXECUTIVE_DIRECTOR";
  const isManager = user.role === "MANAGER";

  if (!isED && !isManager) redirect("/dashboard");

  let branchOptions: { id: string; name: string }[] = [];
  let managedBranchIds: string[] = [];

  if (isED) {
    branchOptions = await prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    managedBranchIds = branchOptions.map((b) => b.id);
  } else {
    const managed = await prisma.branchManager.findMany({
      where: { managerId: user.id },
      include: { branch: { select: { id: true, name: true } } },
    });
    branchOptions = managed.map((m) => m.branch);
    managedBranchIds = managed.map((m) => m.branchId);
  }

  const branchFilter = isED ? {} : { branchId: { in: managedBranchIds } };

  const snapshots = await prisma.stockSnapshot.findMany({
    where: branchFilter,
    orderBy: { date: "desc" },
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
      reviewedBy: { select: { id: true, fullName: true } },
    },
  });

  const settings = await prisma.systemSettings.findUnique({
    where: { id: "singleton" },
    select: { stockVarianceThreshold: true },
  });
  const varianceThreshold = Number(settings?.stockVarianceThreshold ?? 5);

  // Fetch live stock for each branch (ED only — used for branch overview cards)
  const liveStockMap: Record<string, number> = {};
  if (isED) {
    await Promise.all(
      branchOptions.map(async (b) => {
        liveStockMap[b.id] = await getBranchAvailableLiters(b.id);
      })
    );
  }

  // Fetch last approved snapshot per branch for "Last Physical Count"
  const lastSnapshotMap: Record<string, { physicalLiters: number; date: string } | null> = {};
  if (isED) {
    await Promise.all(
      branchOptions.map(async (b) => {
        const snap = await prisma.stockSnapshot.findFirst({
          where: { branchId: b.id, status: "APPROVED" },
          orderBy: { date: "desc" },
          select: { physicalLiters: true, date: true },
        });
        lastSnapshotMap[b.id] = snap
          ? { physicalLiters: Number(snap.physicalLiters), date: snap.date.toISOString() }
          : null;
      })
    );
  }

  const serialized = snapshots.map((s) => ({
    ...s,
    date: s.date.toISOString(),
    physicalLiters: s.physicalLiters.toString(),
    computedLiters: s.computedLiters.toString(),
    varianceLiters: s.varianceLiters.toString(),
    reviewedAt: s.reviewedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <PackageSearch className="w-5 h-5 text-teal-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Snapshots</h1>
          <p className="text-sm text-gray-400">
            Physical counts anchoring the running stock balance — variance &le;{varianceThreshold} L auto-approves
          </p>
        </div>
      </div>

      <StockSnapshotsClient
        initialRecords={serialized}
        branchOptions={branchOptions}
        userRole={user.role}
        managedBranchIds={managedBranchIds}
        varianceThreshold={varianceThreshold}
        liveStockMap={liveStockMap}
        lastSnapshotMap={lastSnapshotMap}
      />
    </div>
  );
}

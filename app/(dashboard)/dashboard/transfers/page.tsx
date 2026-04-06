import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { ArrowLeftRight } from "lucide-react";
import TransfersClient from "@/components/transfers/TransfersClient";

export default async function TransfersPage() {
  const session = await auth();
  const user = session!.user as { id: string; role: string };

  if (user.role === "OWNER") {
    redirect("/dashboard");
  }

  let managedBranchIds: string[] = [];
  let transferWhere: Record<string, unknown> = {};

  if (user.role === "MANAGER") {
    const managed = await prisma.branchManager.findMany({
      where: { managerId: user.id },
      select: { branchId: true },
    });
    managedBranchIds = managed.map((b) => b.branchId);
    transferWhere = {
      OR: [
        { sourceBranchId: { in: managedBranchIds } },
        { destinationBranchId: { in: managedBranchIds } },
      ],
    };
  }

  const [transfers, branches] = await Promise.all([
    prisma.milkTransfer.findMany({
      where: transferWhere,
      include: {
        sourceBranch: { select: { id: true, name: true } },
        destinationBranch: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialized = transfers.map((t) => ({
    id: t.id,
    date: t.date.toISOString(),
    liters: t.liters.toString(),
    costPerLiter: t.costPerLiter.toString(),
    reason: t.reason,
    status: t.status,
    sourceBranch: t.sourceBranch,
    destinationBranch: t.destinationBranch,
    requestedBy: t.requestedBy,
    approvedBy: t.approvedBy ?? null,
    approvedAt: t.approvedAt ? t.approvedAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <ArrowLeftRight className="w-5 h-5 text-violet-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Milk Transfers</h1>
          <p className="text-sm text-gray-400">
            {transfers.length} transfer{transfers.length !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      <TransfersClient
        initialRecords={serialized}
        branchOptions={branches}
        userRole={user.role}
        managedBranchIds={managedBranchIds}
      />
    </div>
  );
}

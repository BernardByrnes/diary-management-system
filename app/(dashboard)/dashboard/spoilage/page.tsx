import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { Droplets } from "lucide-react";
import SpoilageClient from "@/components/spoilage/SpoilageClient";

export default async function SpoilagePage() {
  const session = await auth();
  const user = session!.user as { id: string; role: string };

  if (user.role === "OWNER") redirect("/dashboard");

  let branchFilter: Record<string, unknown> = {};
  let branchIds: string[] | null = null;

  if (user.role === "MANAGER") {
    const managed = await prisma.branchManager.findMany({
      where: { managerId: user.id },
      select: { branchId: true },
    });
    branchIds = managed.map((b) => b.branchId);
    branchFilter = { branchId: { in: branchIds } };
  }

  const [records, branches] = await Promise.all([
    prisma.milkSpoilage.findMany({
      where: branchFilter,
      orderBy: { date: "desc" },
      take: 200,
      include: {
        branch: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, fullName: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    }),
    user.role === "EXECUTIVE_DIRECTOR"
      ? prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })
      : prisma.branch.findMany({ where: { isActive: true, id: { in: branchIds ?? [] } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const serialized = records.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    liters: r.liters.toString(),
    reason: r.reason,
    status: r.status,
    branch: r.branch,
    reportedBy: r.reportedBy,
    reviewedBy: r.reviewedBy,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
          <Droplets className="w-5 h-5 text-orange-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Milk Spoilage</h1>
          <p className="text-sm text-gray-400">
            {records.length} record{records.length !== 1 ? "s" : ""}
            {user.role === "MANAGER" && " — pending records require ED approval before affecting stock"}
          </p>
        </div>
      </div>

      <SpoilageClient
        initialRecords={serialized}
        branchOptions={branches}
        userRole={user.role}
      />
    </div>
  );
}

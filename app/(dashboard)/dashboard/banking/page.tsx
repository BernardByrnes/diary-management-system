import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { Landmark } from "lucide-react";
import BankingClient from "@/components/banking/BankingClient";

export default async function BankingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user as { id: string; role: string };

  if (user.role === "OWNER") {
    redirect("/dashboard");
  }

  // Build branch filter for MANAGER
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

  const [deposits, branches] = await Promise.all([
    prisma.bankDeposit.findMany({
      where: branchFilter,
      orderBy: { date: "desc" },
      include: {
        branch: { select: { id: true, name: true } },
        recordedBy: { select: { id: true, fullName: true } },
      },
    }),
    user.role === "EXECUTIVE_DIRECTOR"
      ? prisma.branch.findMany({
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : prisma.branch.findMany({
          where: { isActive: true, id: { in: branchIds ?? [] } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
  ]);

  const serializedDeposits = deposits.map((d) => ({
    id: d.id,
    date: d.date.toISOString(),
    amount: d.amount.toString(),
    bankName: d.bankName,
    referenceNumber: d.referenceNumber,
    hasDiscrepancy: d.hasDiscrepancy,
    discrepancyNote: d.discrepancyNote,
    branch: d.branch,
    recordedBy: d.recordedBy,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <Landmark className="w-5 h-5 text-indigo-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Deposits</h1>
          <p className="text-sm text-gray-400">
            {deposits.length} deposit{deposits.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
      </div>

      <BankingClient
        initialRecords={serializedDeposits}
        branchOptions={branches}
        userRole={user.role}
      />
    </div>
  );
}

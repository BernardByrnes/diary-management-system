import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { Wallet } from "lucide-react";
import AdvancesClient from "@/components/advances/AdvancesClient";

export default async function AdvancesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user as { id: string; role: string };

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    redirect("/dashboard");
  }

  const [advances, suppliers, owners, branches] = await Promise.all([
    prisma.advance.findMany({
      orderBy: { date: "desc" },
      include: {
        supplier: { select: { id: true, name: true } },
        owner: { select: { id: true, fullName: true } },
        branch: { select: { id: true, name: true } },
        recordedBy: { select: { id: true, fullName: true } },
      },
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "OWNER", isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedAdvances = advances.map((a) => ({
    id: a.id,
    recipientType: a.recipientType as "SUPPLIER" | "OWNER",
    amount: a.amount.toString(),
    date: a.date.toISOString(),
    purpose: a.purpose,
    isDeducted: a.isDeducted,
    deductedAt: a.deductedAt ? a.deductedAt.toISOString() : null,
    supplier: a.supplier,
    owner: a.owner,
    branch: a.branch,
    recordedBy: a.recordedBy,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advances</h1>
          <p className="text-sm text-gray-400">
            {advances.length} advance{advances.length !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      <AdvancesClient
        initialRecords={serializedAdvances}
        supplierOptions={suppliers}
        ownerOptions={owners}
        branchOptions={branches}
      />
    </div>
  );
}

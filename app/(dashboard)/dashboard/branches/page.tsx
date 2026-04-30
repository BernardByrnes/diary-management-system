import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { Building2 } from "lucide-react";
import BranchesClient from "@/components/branches/BranchesClient";

export default async function BranchesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user as { id: string; role: string };

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    redirect("/dashboard");
  }

  const [branches, owners, managers] = await Promise.all([
    prisma.branch.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, fullName: true, phone: true } },
        managers: {
          include: { manager: { select: { id: true, fullName: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: "OWNER", isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "MANAGER", isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const serialized = branches.map((b) => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
    updatedAt: undefined,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-green-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="text-sm text-gray-400">
            {branches.length} branch{branches.length !== 1 ? "es" : ""} total
          </p>
        </div>
      </div>

      <BranchesClient
        initialBranches={serialized as Parameters<typeof BranchesClient>[0]["initialBranches"]}
        ownerOptions={owners}
        managerOptions={managers}
      />
    </div>
  );
}

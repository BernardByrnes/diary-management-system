import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { FlaskConical } from "lucide-react";
import LactometerClient from "@/components/lactometer/LactometerClient";

export default async function LactometerPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user as { id: string; role: string };

  if (user.role === "OWNER") {
    redirect("/dashboard");
  }

  let managedBranchIds: string[] = [];
  let readingWhere: Record<string, unknown> = {};

  if (user.role === "MANAGER") {
    const managed = await prisma.branchManager.findMany({
      where: { managerId: user.id },
      select: { branchId: true },
    });
    managedBranchIds = managed.map((b) => b.branchId);
    readingWhere = { branchId: { in: managedBranchIds } };
  }

  const [readings, branches, settings] = await Promise.all([
    prisma.lactometerReading.findMany({
      where: readingWhere,
      include: {
        branch: { select: { id: true, name: true } },
        recordedBy: { select: { id: true, fullName: true } },
      },
      orderBy: [{ date: "desc" }, { time: "desc" }],
    }),
    prisma.branch.findMany({
      where:
        user.role === "MANAGER"
          ? { isActive: true, id: { in: managedBranchIds } }
          : { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.systemSettings.findUnique({
      where: { id: "singleton" },
      select: { lactometerMin: true, lactometerMax: true },
    }),
  ]);

  const serialized = readings.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    time: r.time,
    readingValue: r.readingValue.toString(),
    notes: r.notes,
    branch: r.branch,
    recordedBy: r.recordedBy,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-cyan-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lactometer Readings</h1>
          <p className="text-sm text-gray-400">
            {readings.length} reading{readings.length !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      <LactometerClient
        initialRecords={serialized}
        branchOptions={branches}
        userRole={user.role}
        rangeMin={settings ? Number(settings.lactometerMin) : 1.026}
        rangeMax={settings ? Number(settings.lactometerMax) : 1.032}
      />
    </div>
  );
}

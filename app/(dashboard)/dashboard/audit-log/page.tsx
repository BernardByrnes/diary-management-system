import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { enrichAuditLogRows } from "@/lib/utils/audit-enrich";
import { ClipboardList } from "lucide-react";
import AuditLogClient from "@/components/audit/AuditLogClient";

export default async function AuditLogPage() {
  const session = await auth();
  const user = session!.user as { id: string; role: string };

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    redirect("/dashboard");
  }

  const [logsData, users, entityTypesRaw] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: { select: { id: true, fullName: true, role: true } },
      },
    }),
    prisma.user.findMany({
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.auditLog.groupBy({
      by: ["entityType"],
      orderBy: { entityType: "asc" },
    }),
  ]);

  const total = await prisma.auditLog.count();

  const enriched = await enrichAuditLogRows(logsData);

  const serialized = enriched.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));

  const entityTypes = entityTypesRaw.map((e) => e.entityType);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-green-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-400">
            Read-only record of all system actions — {total.toLocaleString()} total entries
          </p>
        </div>
      </div>

      <AuditLogClient
        initialLogs={serialized}
        initialTotal={total}
        users={users}
        entityTypes={entityTypes}
      />
    </div>
  );
}

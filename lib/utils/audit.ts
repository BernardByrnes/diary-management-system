import { prisma } from "@/lib/db/prisma";
import type { AuditAction } from "@prisma/client";

export async function createAuditLog({
  action,
  entityType,
  entityId,
  userId,
  changes,
}: {
  action: AuditAction;
  entityType: string;
  entityId: string;
  userId: string;
  changes?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      userId,
      changes: changes ? (changes as object) : undefined,
    },
  });
}

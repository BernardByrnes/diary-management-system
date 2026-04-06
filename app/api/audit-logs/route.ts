import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { enrichAuditLogRows } from "@/lib/utils/audit-enrich";

export async function GET(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;
  const role = user.role;
  if (role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const skip = (page - 1) * limit;

  const userId = searchParams.get("userId") || undefined;
  const action = searchParams.get("action") || undefined;
  const entityType = searchParams.get("entityType") || undefined;
  const entityId = searchParams.get("entityId") || undefined;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;

  const where = {
    ...(userId && { userId }),
    ...(action && { action: action as "CREATE" | "UPDATE" | "DELETE" }),
    ...(entityType && { entityType }),
    ...(entityId && { entityId }),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo + "T23:59:59.999Z") }),
          },
        }
      : {}),
  };

  const [logsRaw, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, fullName: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const logs = await enrichAuditLogRows(logsRaw);

  return NextResponse.json({ logs, total, page, limit });
}

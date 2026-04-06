import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { getBranchAvailableLiters } from "@/lib/utils/stock";
import { createNotification } from "@/lib/utils/notifications";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";

const snapshotSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  date: z.string().min(1, "Date is required"),
  physicalLiters: z.number().nonnegative("Liters cannot be negative"),
  notes: z.string().optional(),
});

export async function GET() {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  const isED = user.role === "EXECUTIVE_DIRECTOR";
  const isManager = user.role === "MANAGER";

  if (!isED && !isManager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let branchFilter: { branchId?: string | { in: string[] } } = {};

  if (isManager) {
    const managed = await prisma.branchManager.findMany({
      where: { managerId: user.id },
      select: { branchId: true },
    });
    const ids = managed.map((m) => m.branchId);
    branchFilter = { branchId: { in: ids } };
  }

  const snapshots = await prisma.stockSnapshot.findMany({
    where: branchFilter,
    orderBy: { date: "desc" },
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
      reviewedBy: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json(snapshots);
}

export async function POST(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  const isED = user.role === "EXECUTIVE_DIRECTOR";
  const isManager = user.role === "MANAGER";
  if (!isED && !isManager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = snapshotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { branchId, date, physicalLiters, notes } = parsed.data;

  // Verify the manager is assigned to this branch (ED bypasses check)
  if (isManager) {
    const assignment = await prisma.branchManager.findFirst({
      where: { managerId: user.id, branchId },
    });
    if (!assignment) {
      return NextResponse.json({ error: "You are not assigned to this branch" }, { status: 403 });
    }
  }

  const snapshotDate = new Date(date);
  snapshotDate.setUTCHours(0, 0, 0, 0);

  // Compute what the system thinks stock is right now
  const computedLiters = await getBranchAvailableLiters(branchId);
  const varianceLiters = physicalLiters - computedLiters;

  // Load the auto-approval threshold
  const settings = await prisma.systemSettings.findUnique({
    where: { id: "singleton" },
    select: { stockVarianceThreshold: true },
  });
  const threshold = Number(settings?.stockVarianceThreshold ?? 5);

  const autoApprove = isED || Math.abs(varianceLiters) <= threshold;
  const now = new Date();

  const snapshot = await prisma.stockSnapshot.create({
    data: {
      branchId,
      date: snapshotDate,
      physicalLiters,
      computedLiters,
      varianceLiters,
      notes: notes ?? null,
      status: autoApprove ? "APPROVED" : "PENDING",
      recordedById: user.id,
      reviewedById: autoApprove ? user.id : null,
      reviewedAt: autoApprove ? now : null,
    },
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
      reviewedBy: { select: { id: true, fullName: true } },
    },
  });

  // Notify ED if the snapshot is pending review
  if (!autoApprove) {
    const eds = await prisma.user.findMany({
      where: { role: "EXECUTIVE_DIRECTOR", isActive: true },
      select: { id: true },
    });
    for (const ed of eds) {
      await createNotification({
        type: "SNAPSHOT_PENDING",
        title: "Stock Snapshot Needs Review",
        message: `${snapshot.branch.name}: manager counted ${physicalLiters.toFixed(1)} L vs ${computedLiters.toFixed(1)} L computed (${varianceLiters >= 0 ? "+" : ""}${varianceLiters.toFixed(1)} L variance). Approval required.`,
        urgency: "MEDIUM",
        userId: ed.id,
        relatedEntityType: "StockSnapshot",
        relatedEntityId: snapshot.id,
      });
    }
  }

  await createAuditLog({
    action: "CREATE",
    entityType: "StockSnapshot",
    entityId: snapshot.id,
    userId: user.id,
    changes: { branchId, date, physicalLiters, computedLiters, varianceLiters, status: snapshot.status },
  });

  return NextResponse.json(snapshot, { status: 201 });
}

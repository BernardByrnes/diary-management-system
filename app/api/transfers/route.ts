import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import { createNotification } from "@/lib/utils/notifications";
import { getFifoStateForBranch } from "@/lib/utils/fifo";
import { z } from "zod";

const transferSchema = z.object({
  date: z.string().min(1, "Date is required"),
  liters: z.coerce.number().positive("Liters must be positive"),
  costPerLiter: z.coerce.number().positive("Cost per liter must be positive"),
  reason: z.string().min(1, "Reason is required"),
  sourceBranchId: z.string().min(1, "Source branch is required"),
  destinationBranchId: z.string().min(1, "Destination branch is required"),
});

export async function GET() {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  let where: Record<string, unknown> = {};

  if (user.role === "MANAGER") {
    const managed = await prisma.branchManager.findMany({
      where: { managerId: user.id },
      select: { branchId: true },
    });
    const ids = managed.map((b) => b.branchId);
    where = {
      OR: [
        { sourceBranchId: { in: ids } },
        { destinationBranchId: { in: ids } },
      ],
    };
  } else if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const transfers = await prisma.milkTransfer.findMany({
    where,
    include: {
      sourceBranch: { select: { id: true, name: true } },
      destinationBranch: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, fullName: true } },
      approvedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(transfers);
}

export async function POST(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (!["EXECUTIVE_DIRECTOR", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { date, liters, costPerLiter, reason, sourceBranchId, destinationBranchId } =
    parsed.data;

  if (sourceBranchId === destinationBranchId) {
    return NextResponse.json(
      { error: "Source and destination branches must be different" },
      { status: 400 }
    );
  }

  if (user.role === "MANAGER") {
    const managed = await prisma.branchManager.findFirst({
      where: { managerId: user.id, branchId: sourceBranchId },
    });
    if (!managed) {
      return NextResponse.json(
        { error: "You can only request transfers from your managed branch" },
        { status: 403 }
      );
    }
  }

  const isED = user.role === "EXECUTIVE_DIRECTOR";
  const now = new Date();

  // Inherit the retail price of the source branch's current FIFO lot so the
  // destination branch knows what price to sell this milk at.
  const { retailPricePerLiter } = await getFifoStateForBranch(sourceBranchId);

  const transfer = await prisma.milkTransfer.create({
    data: {
      date: new Date(date),
      liters,
      costPerLiter,
      retailPricePerLiter: retailPricePerLiter ?? undefined,
      reason,
      sourceBranchId,
      destinationBranchId,
      requestedById: user.id,
      status: isED ? "APPROVED" : "PENDING",
      approvedById: isED ? user.id : null,
      approvedAt: isED ? now : null,
    },
    include: {
      sourceBranch: { select: { id: true, name: true } },
      destinationBranch: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, fullName: true } },
      approvedBy: { select: { id: true, fullName: true } },
    },
  });

  await createAuditLog({
    action: "CREATE",
    entityType: "MilkTransfer",
    entityId: transfer.id,
    userId: user.id,
    changes: { liters, costPerLiter, reason, sourceBranchId, destinationBranchId },
  });

  // Only notify ED of pending transfer when a Manager created it (ED auto-approves their own)
  if (!isED) {
    const ed = await prisma.user.findFirst({
      where: { role: "EXECUTIVE_DIRECTOR", isActive: true },
      select: { id: true },
    });
    if (ed) {
      await createNotification({
        type: "TRANSFER_PENDING",
        title: "Milk Transfer Pending Approval",
        message: `${transfer.requestedBy.fullName} requested a transfer of ${Number(liters).toFixed(1)}L from ${transfer.sourceBranch.name} to ${transfer.destinationBranch.name}. Reason: ${reason}`,
        urgency: "MEDIUM",
        userId: ed.id,
        relatedEntityType: "transfer",
        relatedEntityId: transfer.id,
      });
    }
  }

  return NextResponse.json(transfer, { status: 201 });
}

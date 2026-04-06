import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]).optional(),
  date: z.string().optional(),
  liters: z.coerce.number().positive().optional(),
  costPerLiter: z.coerce.number().positive().optional(),
  reason: z.string().min(1).optional(),
  sourceBranchId: z.string().optional(),
  destinationBranchId: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json(
      { error: "Only the Executive Director can approve or update transfers." },
      { status: 403 }
    );
  }

  const { id } = await params;

  const existing = await prisma.milkTransfer.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { status, date, liters, costPerLiter, reason, sourceBranchId, destinationBranchId } =
    parsed.data;

  // If updating fields, only allowed when PENDING
  const fieldUpdate = date || liters || costPerLiter || reason || sourceBranchId || destinationBranchId;
  if (fieldUpdate && existing.status !== "PENDING") {
    const statusLabel = existing.status.charAt(0) + existing.status.slice(1).toLowerCase();
    return NextResponse.json(
      { error: `This transfer has already been ${statusLabel} and can no longer be edited.` },
      { status: 409 }
    );
  }

  if (sourceBranchId && destinationBranchId && sourceBranchId === destinationBranchId) {
    return NextResponse.json(
      { error: "Source and destination branches must be different" },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (status) {
    updateData.status = status;
    updateData.approvedById = user.id;
    updateData.approvedAt = new Date();
  }
  if (date) updateData.date = new Date(date);
  if (liters !== undefined) updateData.liters = liters;
  if (costPerLiter !== undefined) updateData.costPerLiter = costPerLiter;
  if (reason) updateData.reason = reason;
  if (sourceBranchId) updateData.sourceBranchId = sourceBranchId;
  if (destinationBranchId) updateData.destinationBranchId = destinationBranchId;

  const transfer = await prisma.milkTransfer.update({
    where: { id },
    data: updateData,
    include: {
      sourceBranch: { select: { id: true, name: true } },
      destinationBranch: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, fullName: true } },
      approvedBy: { select: { id: true, fullName: true } },
    },
  });

  await createAuditLog({
    action: "UPDATE",
    entityType: "MilkTransfer",
    entityId: id,
    userId: user.id,
    changes: updateData,
  });

  return NextResponse.json(transfer);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (!["EXECUTIVE_DIRECTOR", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.milkTransfer.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
  }

  if (user.role === "MANAGER") {
    if (existing.requestedById !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own transfer requests" },
        { status: 403 }
      );
    }
    if (existing.status !== "PENDING") {
      const statusLabel = existing.status.charAt(0) + existing.status.slice(1).toLowerCase();
      return NextResponse.json(
        { error: `This transfer has already been ${statusLabel} and cannot be cancelled.` },
        { status: 409 }
      );
    }
  }

  await prisma.milkTransfer.delete({ where: { id } });

  await createAuditLog({
    action: "DELETE",
    entityType: "MilkTransfer",
    entityId: id,
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}

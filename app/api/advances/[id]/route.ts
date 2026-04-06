import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.advance.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Advance not found" }, { status: 404 });
  }

  const body = await request.json();
  const { isDeducted, purpose, amount } = body as {
    isDeducted?: boolean;
    purpose?: string;
    amount?: number;
  };

  const updateData: Record<string, unknown> = {};

  if (isDeducted !== undefined) {
    updateData.isDeducted = isDeducted;
    if (isDeducted === true && !existing.isDeducted) {
      updateData.deductedAt = new Date();
    }
  }

  if (purpose !== undefined) {
    if (typeof purpose !== "string" || purpose.trim().length === 0) {
      return NextResponse.json({ error: "Purpose cannot be empty" }, { status: 400 });
    }
    updateData.purpose = purpose.trim();
  }

  if (amount !== undefined) {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }
    updateData.amount = num;
  }

  const advance = await prisma.advance.update({
    where: { id },
    data: updateData,
    include: {
      supplier: { select: { id: true, name: true } },
      owner: { select: { id: true, fullName: true } },
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
    },
  });

  await createAuditLog({
    action: "UPDATE",
    entityType: "Advance",
    entityId: id,
    userId: user.id,
    changes: updateData,
  });

  return NextResponse.json(advance);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.advance.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Advance not found" }, { status: 404 });
  }

  if (existing.isDeducted) {
    return NextResponse.json(
      { error: "Cannot delete an advance that has already been deducted" },
      { status: 400 }
    );
  }

  await prisma.advance.delete({ where: { id } });

  await createAuditLog({
    action: "DELETE",
    entityType: "Advance",
    entityId: id,
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}

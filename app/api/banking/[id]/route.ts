import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import { updateBankDepositSchema } from "@/lib/validations/bank-deposit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR" && user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.bankDeposit.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Bank deposit not found" }, { status: 404 });
  }

  // MANAGER: verify they manage the branch this deposit belongs to
  if (user.role === "MANAGER") {
    const managed = await prisma.branchManager.findFirst({
      where: { managerId: user.id, branchId: existing.branchId },
    });
    if (!managed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json();
  const parsed = updateBankDepositSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const deposit = await prisma.bankDeposit.update({
    where: { id },
    data: {
      ...(data.date !== undefined ? { date: new Date(data.date) } : {}),
      ...(data.branchId !== undefined ? { branchId: data.branchId } : {}),
      ...(data.amount !== undefined ? { amount: data.amount } : {}),
      ...(data.bankName !== undefined ? { bankName: data.bankName } : {}),
      ...(data.referenceNumber !== undefined
        ? { referenceNumber: data.referenceNumber }
        : {}),
      ...(data.hasDiscrepancy !== undefined ? { hasDiscrepancy: data.hasDiscrepancy } : {}),
      ...(data.discrepancyNote !== undefined
        ? { discrepancyNote: data.discrepancyNote ?? null }
        : {}),
    },
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
    },
  });

  await createAuditLog({
    action: "UPDATE",
    entityType: "BankDeposit",
    entityId: id,
    userId: user.id,
    changes: data as Record<string, unknown>,
  });

  return NextResponse.json(deposit);
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

  const existing = await prisma.bankDeposit.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Bank deposit not found" }, { status: 404 });
  }

  await prisma.bankDeposit.delete({ where: { id } });

  await createAuditLog({
    action: "DELETE",
    entityType: "BankDeposit",
    entityId: id,
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}

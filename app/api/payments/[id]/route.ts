import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import { getActiveUserOrError } from "@/lib/utils/session";
import { z } from "zod";

const patchSchema = z.object({
  paymentMethod: z.string().min(1).optional(),
  paymentReference: z.string().optional(),
});

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
  const existing = await prisma.supplierPayment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.paymentMethod !== undefined) updateData.paymentMethod = parsed.data.paymentMethod;
  if (parsed.data.paymentReference !== undefined) updateData.paymentReference = parsed.data.paymentReference;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const payment = await prisma.supplierPayment.update({
    where: { id },
    data: updateData,
    include: { supplier: { select: { id: true, name: true } } },
  });

  await createAuditLog({
    action: "UPDATE",
    entityType: "SupplierPayment",
    entityId: id,
    userId: user.id,
    changes: updateData,
  });

  return NextResponse.json(payment);
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
  const existing = await prisma.supplierPayment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // Restore any advances that were deducted by this payment
  await prisma.$transaction(async (tx) => {
    await tx.advance.updateMany({
      where: { deductedFromId: id },
      data: { isDeducted: false, deductedAt: null, deductedFromId: null },
    });
    await tx.supplierPayment.delete({ where: { id } });
  });

  await createAuditLog({
    action: "DELETE",
    entityType: "SupplierPayment",
    entityId: id,
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}

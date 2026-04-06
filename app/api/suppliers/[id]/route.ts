import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { updateSupplierSchema } from "@/lib/validations/supplier";
import { createAuditLog } from "@/lib/utils/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  const role = user.role;
  if (!["EXECUTIVE_DIRECTOR", "MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSupplierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  // Deactivation guard: warn if supplier has outstanding advances
  if (parsed.data.isActive === false) {
    const outstandingAdvances = await prisma.advance.aggregate({
      where: { supplierId: id, isDeducted: false },
      _sum: { amount: true },
      _count: true,
    });
    const total = Number(outstandingAdvances._sum.amount ?? 0);
    if (total > 0 && !body.forceDeactivate) {
      return NextResponse.json(
        {
          error: `This supplier has ${outstandingAdvances._count} outstanding advance(s) totalling UGX ${total.toLocaleString()}. Deduct or clear these first, or confirm with forceDeactivate=true.`,
          outstandingAmount: total,
          requiresConfirmation: true,
        },
        { status: 409 }
      );
    }
  }

  if (parsed.data.phone) {
    const existing = await prisma.supplier.findFirst({
      where: { phone: parsed.data.phone, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A supplier with this phone number already exists" },
        { status: 409 }
      );
    }
  }

  const supplier = await prisma.supplier.update({
    where: { id },
    data: parsed.data,
  });

  await createAuditLog({
    action: "UPDATE",
    entityType: "Supplier",
    entityId: id,
    userId: user.id,
    changes: parsed.data as Record<string, unknown>,
  });

  return NextResponse.json(supplier);
}

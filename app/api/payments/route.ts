import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import { getActiveUserOrError } from "@/lib/utils/session";
import { z } from "zod";

const paySchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  amountPaid: z.number().positive("Amount must be greater than zero"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  paymentReference: z.string().optional(),
});

export async function GET() {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payments = await prisma.supplierPayment.findMany({
    where: { status: "PAID" },
    include: { supplier: { select: { id: true, name: true } } },
    orderBy: { paidAt: "desc" },
  });

  return NextResponse.json(payments);
}

export async function POST(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = paySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { supplierId, amountPaid, paymentMethod, paymentReference } = parsed.data;
  const now = new Date();

  // Snapshot balance at time of payment
  const [milkAgg, paidAgg, outstandingAdvances, lastPayment] = await Promise.all([
    prisma.milkSupply.aggregate({
      _sum: { totalCost: true },
      where: { supplierId },
    }),
    prisma.supplierPayment.aggregate({
      _sum: { paidAmount: true },
      where: { supplierId, status: "PAID" },
    }),
    prisma.advance.findMany({
      where: { supplierId, recipientType: "SUPPLIER", isDeducted: false },
      select: { id: true, amount: true },
    }),
    prisma.supplierPayment.findFirst({
      where: { supplierId, status: "PAID" },
      orderBy: { paidAt: "desc" },
      select: { paidAt: true, periodEnd: true },
    }),
  ]);

  const totalDeliveries = Number(milkAgg._sum.totalCost ?? 0);
  const totalPreviouslyPaid = Number(paidAgg._sum.paidAmount ?? 0);
  const grossAmount = Math.max(0, totalDeliveries - totalPreviouslyPaid);
  const advanceDeductions = outstandingAdvances.reduce((sum, a) => sum + Number(a.amount), 0);
  const netAmount = Math.max(0, grossAmount - advanceDeductions);

  if (amountPaid > netAmount + 0.01) {
    return NextResponse.json(
      { error: `Amount exceeds balance of UGX ${netAmount.toLocaleString()}` },
      { status: 400 }
    );
  }

  // periodStart = day after last payment, or date of first delivery
  let periodStart: Date;
  if (lastPayment) {
    const after = new Date(lastPayment.paidAt ?? lastPayment.periodEnd);
    after.setDate(after.getDate() + 1);
    after.setHours(0, 0, 0, 0);
    periodStart = after;
  } else {
    const firstDelivery = await prisma.milkSupply.findFirst({
      where: { supplierId },
      orderBy: { date: "asc" },
      select: { date: true },
    });
    periodStart = firstDelivery?.date ?? now;
  }

  const payment = await prisma.supplierPayment.create({
    data: {
      supplierId,
      periodStart,
      periodEnd: now,
      grossAmount,
      advanceDeductions,
      netAmount,
      paidAmount: amountPaid,
      status: "PAID",
      paidAt: now,
      scheduledDate: now,
      paymentMethod,
      paymentReference: paymentReference ?? null,
    },
    include: {
      supplier: { select: { id: true, name: true } },
    },
  });

  // Settle all outstanding advances
  if (outstandingAdvances.length > 0) {
    await prisma.advance.updateMany({
      where: { supplierId, recipientType: "SUPPLIER", isDeducted: false },
      data: { isDeducted: true, deductedAt: now, deductedFromId: payment.id },
    });
  }

  await createAuditLog({
    action: "CREATE",
    entityType: "SupplierPayment",
    entityId: payment.id,
    userId: user.id,
    changes: { supplierId, amountPaid, paymentMethod, grossAmount, netAmount },
  });

  return NextResponse.json(payment, { status: 201 });
}

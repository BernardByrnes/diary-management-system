import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";

const bulkDepositSchema = z.object({
  branchId: z.string().min(1),
  date: z.string().min(1),
  deposits: z.array(z.object({
    bankName: z.string().min(1, "Bank name is required"),
    referenceNumber: z.string().min(1, "Reference number is required"),
    amount: z.number().positive("Amount must be positive"),
    hasDiscrepancy: z.boolean().default(false),
    discrepancyNote: z.string().nullish(),
  })).min(1),
});

export async function POST(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Only ED can create bulk bank deposits" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = bulkDepositSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { branchId, date, deposits } = parsed.data;

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

  const created = await prisma.$transaction(async (tx) => {
    const results = [];
    for (const d of deposits) {
      const record = await tx.bankDeposit.create({
        data: {
          date: new Date(date),
          branchId,
          amount: d.amount,
          bankName: d.bankName,
          referenceNumber: d.referenceNumber,
          hasDiscrepancy: d.hasDiscrepancy ?? false,
          discrepancyNote: d.discrepancyNote ?? null,
          recordedById: user.id,
        },
        include: { branch: { select: { id: true, name: true } }, recordedBy: { select: { id: true, fullName: true } } },
      });
      results.push(record);
    }
    return results;
  }, { timeout: 30000, maxWait: 10000 });

  await Promise.all(created.map((r) => createAuditLog({ action: "CREATE", entityType: "BankDeposit", entityId: r.id, userId: user.id, changes: { bulk: true } })));

  return NextResponse.json(created, { status: 201 });
}

import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";

const bulkAdvanceSchema = z.object({
  entries: z.array(z.object({
    date: z.string().min(1, "Date is required"),
    amount: z.number().positive("Amount must be positive"),
    purpose: z.string().min(1, "Purpose is required"),
    recipientType: z.enum(["SUPPLIER", "OWNER"]),
    supplierId: z.string().optional(),
    ownerId: z.string().optional(),
    branchId: z.string().optional(),
  })).min(1),
});

export async function POST(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Only ED can create bulk advances" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = bulkAdvanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { entries } = parsed.data;

  const created = await prisma.$transaction(async (tx) => {
    const results = [];
    for (const e of entries) {
      const record = await tx.advance.create({
        data: {
          date: new Date(e.date),
          amount: e.amount,
          purpose: e.purpose,
          recipientType: e.recipientType,
          supplierId: e.supplierId ?? null,
          ownerId: e.ownerId ?? null,
          branchId: e.branchId ?? null,
          recordedById: user.id,
        },
        include: {
          supplier: { select: { id: true, name: true } },
          owner: { select: { id: true, fullName: true } },
          branch: { select: { id: true, name: true } },
          recordedBy: { select: { id: true, fullName: true } },
        },
      });
      results.push(record);
    }
    return results;
  }, { timeout: 30000, maxWait: 10000 });

  await Promise.all(created.map((r) => createAuditLog({ action: "CREATE", entityType: "Advance", entityId: r.id, userId: user.id, changes: { bulk: true } })));

  return NextResponse.json(created, { status: 201 });
}

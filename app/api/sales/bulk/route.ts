import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";

const bulkSaleSchema = z.object({
  branchId: z.string().min(1),
  entries: z.array(z.object({
    date: z.string().min(1, "Date is required"),
    litersSold: z.number().positive("Liters must be positive"),
    pricePerLiter: z.number().positive("Price must be positive"),
  })).min(1),
});

export async function POST(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Only ED can create bulk sales" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = bulkSaleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { branchId, entries } = parsed.data;

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

  const created = await prisma.$transaction(async (tx) => {
    const results = [];
    for (const e of entries) {
      const revenue = e.litersSold * e.pricePerLiter;
      const record = await tx.sale.create({
        data: {
          date: new Date(e.date),
          branchId,
          litersSold: e.litersSold,
          pricePerLiter: e.pricePerLiter,
          revenue,
          recordedById: user.id,
        },
        include: { branch: { select: { id: true, name: true } }, recordedBy: { select: { id: true, fullName: true } } },
      });
      results.push(record);
    }
    return results;
  }, { timeout: 30000, maxWait: 10000 });

  await Promise.all(created.map((r) => createAuditLog({ action: "CREATE", entityType: "Sale", entityId: r.id, userId: user.id, changes: { bulk: true } })));

  return NextResponse.json(created, { status: 201 });
}

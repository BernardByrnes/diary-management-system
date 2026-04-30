import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";

const bulkMilkSchema = z.object({
  branchId: z.string().min(1),
  entries: z.array(z.object({
    date: z.string().min(1, "Date is required"),
    liters: z.number().positive("Liters must be positive"),
    costPerLiter: z.number().positive("Cost per liter must be positive"),
    retailPricePerLiter: z.number().positive().optional(),
    deliveryReference: z.string().optional(),
  })).min(1),
});

export async function POST(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Only ED can create bulk milk deliveries" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = bulkMilkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { branchId, entries } = parsed.data;

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

  const supplier = await prisma.supplier.findFirst({ select: { id: true } });
  if (!supplier) return NextResponse.json({ error: "No supplier found. Add a supplier first." }, { status: 400 });

  const created = await prisma.$transaction(async (tx) => {
    const results = [];
    for (const e of entries) {
      const totalCost = e.liters * e.costPerLiter;
      const record = await tx.milkSupply.create({
        data: {
          date: new Date(e.date),
          branchId,
          supplierId: supplier.id,
          liters: e.liters,
          costPerLiter: e.costPerLiter,
          totalCost,
          retailPricePerLiter: e.retailPricePerLiter ?? e.costPerLiter,
          deliveryReference: e.deliveryReference ?? null,
          recordedById: user.id,
        },
        include: { branch: { select: { id: true, name: true } }, supplier: { select: { id: true, name: true } }, recordedBy: { select: { id: true, fullName: true } } },
      });
      results.push(record);
    }
    return results;
  }, { timeout: 30000, maxWait: 10000 });

  await Promise.all(created.map((r) => createAuditLog({ action: "CREATE", entityType: "MilkSupply", entityId: r.id, userId: user.id, changes: { bulk: true } })));

  return NextResponse.json(created, { status: 201 });
}

import { prisma } from "@/lib/db/prisma";

const FRED_PHONE = "0701000001";

/**
 * Ensures a single milk supplier: Fred Katalekwa. Reassigns all milk supplies and
 * supplier advances from other suppliers, removes their payment rows, then deletes
 * those supplier records. Safe to run multiple times.
 */
export async function consolidateSuppliersToFred(): Promise<{
  fredId: string;
  deletedSupplierCount: number;
}> {
  const fred = await prisma.supplier.upsert({
    where: { phone: FRED_PHONE },
    update: {
      name: "Fred Katalekwa",
      location: "Masaka",
      isActive: true,
    },
    create: {
      name: "Fred Katalekwa",
      phone: FRED_PHONE,
      location: "Masaka",
    },
  });

  const others = await prisma.supplier.findMany({
    where: { id: { not: fred.id } },
    select: { id: true },
  });

  if (others.length === 0) {
    return { fredId: fred.id, deletedSupplierCount: 0 };
  }

  const oldIds = others.map((o) => o.id);

  await prisma.supplierPayment.deleteMany({
    where: { supplierId: { in: oldIds } },
  });

  await prisma.milkSupply.updateMany({
    where: { supplierId: { in: oldIds } },
    data: { supplierId: fred.id },
  });

  await prisma.advance.updateMany({
    where: { supplierId: { in: oldIds } },
    data: { supplierId: fred.id },
  });

  await prisma.supplier.deleteMany({
    where: { id: { in: oldIds } },
  });

  return { fredId: fred.id, deletedSupplierCount: oldIds.length };
}

import { prisma } from "@/lib/db/prisma";

/**
 * Deletes a branch and all dependent rows (order matches FK constraints).
 * Uses sequential calls (not interactive `$transaction`) so the Prisma query
 * retry middleware — which may `$disconnect`/`$connect` — cannot invalidate a transaction.
 */
export async function deleteBranchCascade(branchId: string): Promise<void> {
  await prisma.sale.deleteMany({ where: { branchId } });
  await prisma.milkSupply.deleteMany({ where: { branchId } });
  await prisma.expense.deleteMany({ where: { branchId } });
  await prisma.bankDeposit.deleteMany({ where: { branchId } });
  await prisma.lactometerReading.deleteMany({ where: { branchId } });
  await prisma.milkSpoilage.deleteMany({ where: { branchId } });
  await prisma.stockSnapshot.deleteMany({ where: { branchId } });
  await prisma.profitDistribution.deleteMany({ where: { branchId } });
  await prisma.milkTransfer.deleteMany({
    where: {
      OR: [{ sourceBranchId: branchId }, { destinationBranchId: branchId }],
    },
  });
  await prisma.advance.updateMany({
    where: { branchId },
    data: { branchId: null },
  });
  await prisma.branchManager.deleteMany({ where: { branchId } });
  await prisma.branch.delete({ where: { id: branchId } });
}

/**
 * Removes branches created by API tests (`Integration test branch …`, location contains `Integration test`).
 */
export async function deleteIntegrationTestBranches(): Promise<number> {
  const branches = await prisma.branch.findMany({
    where: {
      OR: [
        { location: { contains: "Integration test", mode: "insensitive" } },
        { name: { startsWith: "Integration test branch", mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  for (const b of branches) {
    await deleteBranchCascade(b.id);
  }
  return branches.length;
}

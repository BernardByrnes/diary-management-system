import { prisma } from "@/lib/db/prisma";

/** Same calendar day: supply + transfers in − sales − transfers out (no balance from other days). */
export type SameDayStockInput = {
  supplyLiters: number;
  soldLiters: number;
  transferOutLiters: number;
  transferInLiters: number;
};

export function computeSameDayNetLiters(input: SameDayStockInput): number {
  const { supplyLiters, soldLiters, transferOutLiters, transferInLiters } =
    input;
  return supplyLiters + transferInLiters - soldLiters - transferOutLiters;
}

/**
 * Net liters available at a branch.
 *
 * If an approved StockSnapshot exists, the most recent one is used as the
 * opening balance and only transactions AFTER that snapshot date are summed.
 * This keeps computed stock anchored to physical counts over time.
 */
export async function getBranchAvailableLiters(branchId: string): Promise<number> {
  const latestSnapshot = await prisma.stockSnapshot.findFirst({
    where: { branchId, status: "APPROVED" },
    orderBy: { date: "desc" },
  });

  // Transactions from the day after the snapshot count toward the running total.
  // If no snapshot exists, all historical records are summed from zero.
  let dateFilter: { gte: Date } | undefined;
  let baseStock = 0;

  if (latestSnapshot) {
    baseStock = Number(latestSnapshot.physicalLiters);
    const nextDay = new Date(latestSnapshot.date);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    nextDay.setUTCHours(0, 0, 0, 0);
    dateFilter = { gte: nextDay };
  }

  const [supply, transferIn, transferOut, sold, spoiled] = await Promise.all([
    prisma.milkSupply.aggregate({
      where: { branchId, ...(dateFilter ? { date: dateFilter } : {}) },
      _sum: { liters: true },
    }),
    prisma.milkTransfer.aggregate({
      where: {
        destinationBranchId: branchId,
        status: "APPROVED",
        ...(dateFilter ? { date: dateFilter } : {}),
      },
      _sum: { liters: true },
    }),
    prisma.milkTransfer.aggregate({
      where: {
        sourceBranchId: branchId,
        status: "APPROVED",
        ...(dateFilter ? { date: dateFilter } : {}),
      },
      _sum: { liters: true },
    }),
    prisma.sale.aggregate({
      where: { branchId, ...(dateFilter ? { date: dateFilter } : {}) },
      _sum: { litersSold: true },
    }),
    prisma.milkSpoilage.aggregate({
      where: {
        branchId,
        status: "APPROVED",
        ...(dateFilter ? { date: dateFilter } : {}),
      },
      _sum: { liters: true },
    }),
  ]);

  const inL =
    Number(supply._sum.liters ?? 0) + Number(transferIn._sum.liters ?? 0);
  const outL =
    Number(sold._sum.litersSold ?? 0) +
    Number(transferOut._sum.liters ?? 0) +
    Number(spoiled._sum.liters ?? 0);
  return baseStock + inL - outL;
}

/** When editing a sale, treat its current liters as back in stock before applying the new amount. */
export async function getAvailableLitersForSaleEdit(
  branchId: string,
  excludeSaleId: string
): Promise<number> {
  const base = await getBranchAvailableLiters(branchId);
  const existing = await prisma.sale.findUnique({ where: { id: excludeSaleId } });
  if (!existing || existing.branchId !== branchId) return base;
  return base + Number(existing.litersSold);
}

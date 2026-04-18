import { prisma } from "@/lib/db/prisma";

export type FifoState = {
  /** Retail price per liter of the current FIFO lot. Null if no stock or no price set. */
  retailPricePerLiter: number | null;
  /** If the current lot is a direct delivery, its ID (for sale linkage). Null for transfer lots. */
  milkSupplyId: string | null;
};

/**
 * Computes the current FIFO lot for a branch.
 *
 * Lots (deliveries + approved incoming transfers) are ordered oldest-first.
 * Total consumption (sales + approved outgoing transfers + approved spoilage)
 * is walked against the lot queue to find which lot is currently being sold from.
 *
 * This gives the correct retail price even when milk arrives via transfer at a
 * different price than the branch's own deliveries.
 */
export async function getFifoStateForBranch(branchId: string): Promise<FifoState> {
  const [deliveries, transfersIn, salesAgg, transfersOutAgg, spoilageAgg] =
    await Promise.all([
      prisma.milkSupply.findMany({
        where: { branchId },
        orderBy: { date: "asc" },
        select: { id: true, date: true, liters: true, retailPricePerLiter: true },
      }),
      prisma.milkTransfer.findMany({
        where: { destinationBranchId: branchId, status: "APPROVED" },
        orderBy: { date: "asc" },
        select: { id: true, date: true, liters: true, retailPricePerLiter: true },
      }),
      prisma.sale.aggregate({
        where: { branchId },
        _sum: { litersSold: true },
      }),
      prisma.milkTransfer.aggregate({
        where: { sourceBranchId: branchId, status: "APPROVED" },
        _sum: { liters: true },
      }),
      prisma.milkSpoilage.aggregate({
        where: { branchId, status: "APPROVED" },
        _sum: { liters: true },
      }),
    ]);

  // Merge deliveries and transfers into a single FIFO queue ordered by date.
  type Lot = {
    id: string;
    date: Date;
    liters: number;
    retailPricePerLiter: number | null;
    isDelivery: boolean;
  };

  const lots: Lot[] = [
    ...deliveries.map((d) => ({
      id: d.id,
      date: d.date,
      liters: Number(d.liters),
      retailPricePerLiter: d.retailPricePerLiter != null ? Number(d.retailPricePerLiter) : null,
      isDelivery: true,
    })),
    ...transfersIn.map((t) => ({
      id: t.id,
      date: t.date,
      liters: Number(t.liters),
      retailPricePerLiter: t.retailPricePerLiter != null ? Number(t.retailPricePerLiter) : null,
      isDelivery: false,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const totalConsumed =
    Number(salesAgg._sum.litersSold ?? 0) +
    Number(transfersOutAgg._sum.liters ?? 0) +
    Number(spoilageAgg._sum.liters ?? 0);

  // Walk lots FIFO until consumed liters are exhausted — the lot where we stop is current.
  let remaining = totalConsumed;
  for (const lot of lots) {
    if (remaining >= lot.liters) {
      remaining -= lot.liters;
    } else {
      return {
        retailPricePerLiter: lot.retailPricePerLiter,
        milkSupplyId: lot.isDelivery ? lot.id : null,
      };
    }
  }

  // No stock remaining (or no lots at all).
  return { retailPricePerLiter: null, milkSupplyId: null };
}

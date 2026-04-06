import { prisma } from "@/lib/db/prisma";

/** Expected bank deposit for a branch on a calendar day: sales revenue minus cash expenses. */
export async function getExpectedDepositForDay(
  branchId: string,
  day: Date
): Promise<number> {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);
  const [rev, cashExp] = await Promise.all([
    prisma.sale.aggregate({
      where: { branchId, date: { gte: start, lte: end } },
      _sum: { revenue: true },
    }),
    prisma.expense.aggregate({
      where: {
        branchId,
        date: { gte: start, lte: end },
        paymentMethod: "CASH",
      },
      _sum: { amount: true },
    }),
  ]);
  return Number(rev._sum.revenue ?? 0) - Number(cashExp._sum.amount ?? 0);
}

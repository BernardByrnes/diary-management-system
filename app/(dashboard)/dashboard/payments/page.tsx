import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { Banknote } from "lucide-react";
import PaymentsClient from "@/components/payments/PaymentsClient";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const session = await auth();
  const user = session!.user as { id: string; role: string };

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    redirect("/dashboard");
  }

  const [payments, suppliers, advances, milkSupplyTotals] = await Promise.all([
    prisma.supplierPayment.findMany({
      where: { status: "PAID" },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { paidAt: "desc" },
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.advance.findMany({
      where: { recipientType: "SUPPLIER", isDeducted: false, supplierId: { not: null } },
      select: { supplierId: true, amount: true },
    }),
    prisma.milkSupply.groupBy({
      by: ["supplierId"],
      _sum: { totalCost: true },
    }),
  ]);

  const milkTotalBySupplier: Record<string, number> = {};
  for (const row of milkSupplyTotals) {
    milkTotalBySupplier[row.supplierId] = Number(row._sum.totalCost ?? 0);
  }

  // Only count paidAmount on fully PAID records
  const paidBySupplier: Record<string, number> = {};
  for (const p of payments) {
    paidBySupplier[p.supplierId] = (paidBySupplier[p.supplierId] ?? 0) + Number(p.paidAmount ?? 0);
  }

  const advancesBySupplier: Record<string, number> = {};
  for (const a of advances) {
    if (a.supplierId) {
      advancesBySupplier[a.supplierId] = (advancesBySupplier[a.supplierId] ?? 0) + Number(a.amount);
    }
  }

  const supplierSummaries = suppliers
    .map((s) => {
      const totalDeliveries = milkTotalBySupplier[s.id] ?? 0;
      const totalPaid = paidBySupplier[s.id] ?? 0;
      const advancesAmt = advancesBySupplier[s.id] ?? 0;
      const balance = Math.max(0, totalDeliveries - totalPaid - advancesAmt);
      return { id: s.id, name: s.name, totalDeliveries, totalPaid, advances: advancesAmt, balance };
    })
    .filter((s) => s.balance > 0);

  const serialized = payments.map((p) => ({
    id: p.id,
    grossAmount: p.grossAmount.toString(),
    advanceDeductions: p.advanceDeductions.toString(),
    netAmount: p.netAmount.toString(),
    paidAmount: p.paidAmount.toString(),
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    paymentMethod: p.paymentMethod,
    paymentReference: p.paymentReference,
    supplier: p.supplier,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
          <Banknote className="w-5 h-5 text-green-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Payments</h1>
          <p className="text-sm text-gray-400">
            {payments.length} payment{payments.length !== 1 ? "s" : ""} recorded ·{" "}
            {supplierSummaries.length} supplier{supplierSummaries.length !== 1 ? "s" : ""} with outstanding balances
          </p>
        </div>
      </div>

      <PaymentsClient
        initialPayments={serialized}
        supplierSummaries={supplierSummaries}
      />
    </div>
  );
}

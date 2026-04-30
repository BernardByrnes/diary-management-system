import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { Banknote } from "lucide-react";
import PaymentsClient from "@/components/payments/PaymentsClient";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user as { id: string; role: string };

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    redirect("/dashboard");
  }

  // Primary supplier (Fred) — oldest record, the one who receives all payments
  const primarySupplier = await prisma.supplier.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  const [payments, milkSupplyTotal, totalPaidAgg, totalAdvancesAgg] = await Promise.all([
    prisma.supplierPayment.findMany({
      where: { status: "PAID" },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { paidAt: "desc" },
    }),
    // Sum ALL supplier milk deliveries — all routes ultimately owed to Fred
    prisma.milkSupply.aggregate({ _sum: { totalCost: true } }),
    prisma.supplierPayment.aggregate({ where: { status: "PAID" }, _sum: { paidAmount: true } }),
    prisma.advance.aggregate({
      where: { recipientType: "SUPPLIER", isDeducted: false, supplierId: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  const totalDeliveries = Number(milkSupplyTotal._sum.totalCost ?? 0);
  const totalPaid = Number(totalPaidAgg._sum.paidAmount ?? 0);
  const totalAdvances = Number(totalAdvancesAgg._sum.amount ?? 0);
  const balance = Math.max(0, totalDeliveries - totalPaid - totalAdvances);

  // Single combined entry for the primary supplier
  const supplierSummaries = primarySupplier && balance > 0
    ? [{ id: primarySupplier.id, name: primarySupplier.name, totalDeliveries, totalPaid, advances: totalAdvances, balance }]
    : [];

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
            {balance > 0 ? `UGX ${balance.toLocaleString()} outstanding` : "All settled"}
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

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { Receipt } from "lucide-react";
import ExpensesClient from "@/components/expenses/ExpensesClient";

export default async function ExpensesPage() {
  const session = await auth();
  const user = session!.user as { id: string; role: string };

  if (user.role === "MANAGER" && false) redirect("/dashboard"); // keep MANAGER access

  // Build branch filter
  let branchFilter: Record<string, unknown> = {};
  let branchIds: string[] | null = null;

  if (user.role === "MANAGER") {
    const managed = await prisma.branchManager.findMany({
      where: { managerId: user.id },
      select: { branchId: true },
    });
    branchIds = managed.map((b) => b.branchId);
    branchFilter = { branchId: { in: branchIds } };
  } else if (user.role === "OWNER") {
    const owned = await prisma.branch.findMany({
      where: { ownerId: user.id },
      select: { id: true },
    });
    branchIds = owned.map((b) => b.id);
    branchFilter = { branchId: { in: branchIds } };
  }

  const [expenses, branches, orgSettings] = await Promise.all([
    prisma.expense.findMany({
      where: branchFilter,
      orderBy: { date: "desc" },
      take: 200,
      include: {
        branch: { select: { id: true, name: true } },
        recordedBy: { select: { id: true, fullName: true } },
      },
    }),
    user.role === "EXECUTIVE_DIRECTOR"
      ? prisma.branch.findMany({
          where: { isActive: true },
          select: { id: true, name: true, rentCycle: true },
          orderBy: { name: "asc" },
        })
      : prisma.branch.findMany({
          where: { isActive: true, id: { in: branchIds ?? [] } },
          select: { id: true, name: true, rentCycle: true },
          orderBy: { name: "asc" },
        }),
    prisma.systemSettings.findUnique({
      where: { id: "singleton" },
      select: { defaultRentCycle: true },
    }),
  ]);

  const defaultRentCycle =
    orgSettings?.defaultRentCycle === "BI_ANNUAL" ? "BI_ANNUAL" : "ANNUAL";

  const serializedExpenses = expenses.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    category: e.category,
    description: e.description,
    amount: e.amount.toString(),
    paymentMethod: e.paymentMethod,
    receiptReference: e.receiptReference,
    isFlagged: e.isFlagged,
    flaggedAt: e.flaggedAt ? e.flaggedAt.toISOString() : null,
    branch: e.branch,
    recordedBy: e.recordedBy,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
          <Receipt className="w-5 h-5 text-red-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-400">
            {expenses.length} record{expenses.length !== 1 ? "s" : ""} found
            {user.role === "OWNER" && " — you can flag expenses for ED review"}
          </p>
        </div>
      </div>

      <ExpensesClient
        initialRecords={serializedExpenses}
        branchOptions={
          user.role === "OWNER"
            ? []
            : branches.map((b) => ({
                id: b.id,
                name: b.name,
                rentCycle: b.rentCycle,
              }))
        }
        defaultRentCycle={defaultRentCycle}
        userRole={user.role}
      />
    </div>
  );
}

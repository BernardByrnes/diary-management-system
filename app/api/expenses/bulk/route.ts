import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import { bulkExpenseSchema, bulkExpenseUpdateSchema } from "@/lib/validations/expense";

export async function GET(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId");
  const periodStart = searchParams.get("periodStart");
  const periodEnd = searchParams.get("periodEnd");

  if (!branchId || !periodStart || !periodEnd) {
    return NextResponse.json(
      { error: "branchId, periodStart, and periodEnd are required" },
      { status: 400 }
    );
  }

  const pStart = new Date(periodStart);
  const pEnd = new Date(periodEnd);
  // Use gte/lte so expenses created via single-entry form (which use @default(now())) are still included
  const expenses = await prisma.expense.findMany({
    where: {
      branchId,
      periodStart: { gte: pStart },
      periodEnd: { lte: pEnd },
    },
    orderBy: { createdAt: "asc" },
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json(expenses);
}

export async function POST(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Only ED can create bulk expenses" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = bulkExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { branchId, periodStart, periodEnd, paymentMethod, receiptReference, coverageMonths, expenses } =
    parsed.data;

  // Verify branch exists
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  // Check if any expense is RENT - only ED can create rent expenses
  const hasRent = expenses.some((e) => e.category === "RENT");
  if (hasRent && user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Only the Executive Director can record rent expenses." }, { status: 403 });
  }

  const periodStartDate = new Date(periodStart);
  const periodEndDate = new Date(periodEnd);

  const createdExpenses = await prisma.$transaction(
    async (tx) => {
      const results = [];

      for (const expense of expenses) {
        const created = await tx.expense.create({
          data: {
            date: periodEndDate,
            periodStart: periodStartDate,
            periodEnd: periodEndDate,
            branchId,
            category: expense.category,
            description: expense.description,
            amount: expense.amount,
            paymentMethod,
            receiptReference: receiptReference ?? null,
            recordedById: user.id,
          },
          include: {
            branch: { select: { id: true, name: true } },
            recordedBy: { select: { id: true, fullName: true } },
          },
        });
        results.push(created);
      }

      // When recording rent, update the branch's rentPaidUntil
      if (hasRent && coverageMonths) {
        const paidUntil = new Date(periodEnd);
        paidUntil.setMonth(paidUntil.getMonth() + coverageMonths);
        await tx.branch.update({
          where: { id: branchId },
          data: { rentPaidUntil: paidUntil },
        });
      }

      return results;
    },
    // Neon pooler default is 5 s — bulk inserts of many rows need more headroom
    { timeout: 30_000, maxWait: 10_000 }
  );

  // Audit log for each created expense — run in parallel to avoid sequential latency
  await Promise.all(
    createdExpenses.map((expense) =>
      createAuditLog({
        action: "CREATE",
        entityType: "Expense",
        entityId: expense.id,
        userId: user.id,
        changes: { bulk: true, periodStart, periodEnd, branchId },
      })
    )
  );

  return NextResponse.json(createdExpenses, { status: 201 });
}

export async function PATCH(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Only ED can update bulk expenses" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = bulkExpenseUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { expenses, periodStart, periodEnd } = parsed.data;

  const updatedExpenses = await prisma.$transaction(
    async (tx) => {
      const results = [];

      for (const line of expenses) {
        if (!line.id) continue;

        // Verify expense exists and user has access
        const existing = await tx.expense.findUnique({ where: { id: line.id } });
        if (!existing) continue;

        const updated = await tx.expense.update({
          where: { id: line.id },
          data: {
            category: line.category,
            description: line.description,
            amount: line.amount,
            ...(periodStart ? { periodStart: new Date(periodStart) } : {}),
            ...(periodEnd ? { periodEnd: new Date(periodEnd) } : {}),
          },
          include: {
            branch: { select: { id: true, name: true } },
            recordedBy: { select: { id: true, fullName: true } },
          },
        });
        results.push(updated);
      }

      return results;
    },
    { timeout: 30_000, maxWait: 10_000 }
  );

  // Audit logs in parallel after the transaction commits
  await Promise.all(
    updatedExpenses.map((updated) =>
      createAuditLog({
        action: "UPDATE",
        entityType: "Expense",
        entityId: updated.id,
        userId: user.id,
        changes: {
          bulk: true,
          category: updated.category,
          description: updated.description,
          amount: updated.amount,
        },
      })
    )
  );

  return NextResponse.json(updatedExpenses);
}

export async function DELETE(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Only ED can delete expenses" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");

  if (!idsParam) {
    return NextResponse.json({ error: "Missing ids parameter" }, { status: 400 });
  }

  const ids = idsParam.split(",").filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }

  await prisma.$transaction(
    async (tx) => {
      for (const id of ids) {
        await tx.expense.delete({ where: { id } });
      }
    },
    { timeout: 30_000, maxWait: 10_000 }
  );

  // Audit logs in parallel after deletes commit
  await Promise.all(
    ids.map((id) =>
      createAuditLog({
        action: "DELETE",
        entityType: "Expense",
        entityId: id,
        userId: user.id,
      })
    )
  );

  return NextResponse.json({ success: true, deleted: ids.length });
}
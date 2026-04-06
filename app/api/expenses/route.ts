import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import { expenseSchema } from "@/lib/validations/expense";

export async function GET() {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  let branchWhere: Record<string, unknown> = {};
  if (user.role === "MANAGER") {
    const managed = await prisma.branchManager.findMany({
      where: { managerId: user.id },
      select: { branchId: true },
    });
    branchWhere = { branchId: { in: managed.map((b) => b.branchId) } };
  } else if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expenses = await prisma.expense.findMany({
    where: branchWhere,
    orderBy: { date: "desc" },
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

  if (user.role !== "EXECUTIVE_DIRECTOR" && user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { date, branchId, category, description, amount, paymentMethod, receiptReference } =
    parsed.data;

  // MANAGER: verify the branch is one they manage
  if (user.role === "MANAGER") {
    const managed = await prisma.branchManager.findFirst({
      where: { managerId: user.id, branchId },
    });
    if (!managed) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { name: true },
      });
      const branchName = branch?.name ?? "that branch";
      return NextResponse.json(
        { error: `You are not assigned to manage ${branchName}.` },
        { status: 403 }
      );
    }
  }

  const expense = await prisma.expense.create({
    data: {
      date: new Date(date),
      branchId,
      category,
      description,
      amount,
      paymentMethod,
      receiptReference: receiptReference ?? null,
      recordedById: user.id,
    },
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
    },
  });

  await createAuditLog({
    action: "CREATE",
    entityType: "Expense",
    entityId: expense.id,
    userId: user.id,
    changes: { date, branchId, category, description, amount, paymentMethod, receiptReference },
  });

  return NextResponse.json(expense, { status: 201 });
}

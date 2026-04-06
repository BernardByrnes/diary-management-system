import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createNotification } from "@/lib/utils/notifications";
import { z } from "zod";

const flagSchema = z.object({
  expenseId: z.string().min(1, "Expense ID is required"),
});

export async function POST(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Only owners can flag expenses" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = flagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { expenseId } = parsed.data;

  // Verify the expense belongs to a branch owned by this user
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      branch: { select: { ownerId: true, name: true } },
    },
  });

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  if (expense.branch.ownerId !== user.id) {
    return NextResponse.json({ error: "You can only flag expenses from your branches" }, { status: 403 });
  }

  const owner = await prisma.user.findUnique({
    where: { id: user.id },
    select: { fullName: true },
  });

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      isFlagged: true,
      flaggedById: user.id,
      flaggedAt: new Date(),
    },
  });

  // Notify the Executive Director
  const ed = await prisma.user.findFirst({
    where: { role: "EXECUTIVE_DIRECTOR", isActive: true },
    select: { id: true },
  });

  if (ed) {
    await createNotification({
      type: "BANKING_DISCREPANCY", // Closest type available; or we could use MISCELLANEOUS
      title: "Expense Flagged for Review",
      message: `Owner ${owner?.fullName ?? "Unknown"} flagged expense "${expense.description}" (UGX ${Number(expense.amount).toLocaleString()}) at ${expense.branch.name} for review.`,
      urgency: "MEDIUM",
      userId: ed.id,
      relatedEntityType: "expense",
      relatedEntityId: expenseId,
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Only owners can unflag expenses" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = flagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { expenseId } = parsed.data;

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { branch: { select: { ownerId: true } } },
  });

  if (!expense || expense.branch.ownerId !== user.id) {
    return NextResponse.json({ error: "Not found or not authorized" }, { status: 404 });
  }

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data: { isFlagged: false, flaggedById: null, flaggedAt: null },
  });

  return NextResponse.json(updated);
}

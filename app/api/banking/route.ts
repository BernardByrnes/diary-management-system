import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import { createNotification } from "@/lib/utils/notifications";
import { bankDepositSchema } from "@/lib/validations/bank-deposit";
import { getExpectedDepositForDay } from "@/lib/utils/banking-reconciliation";
import { shouldFlagBankingDiscrepancy } from "@/lib/utils/reconciliation";
import { getActiveUserOrError } from "@/lib/utils/session";

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

  const deposits = await prisma.bankDeposit.findMany({
    where: branchWhere,
    orderBy: { date: "desc" },
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json(deposits);
}

export async function POST(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR" && user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = bankDepositSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { date, branchId, amount, bankName, referenceNumber, hasDiscrepancy, discrepancyNote } =
    parsed.data;

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

  const depositDate = new Date(date);
  const expected = await getExpectedDepositForDay(branchId, depositDate);
  const settingsRow = await prisma.systemSettings.findUnique({
    where: { id: "singleton" },
  });
  const threshold = Number(settingsRow?.discrepancyThreshold ?? 5000);
  const autoDiscrepancy = shouldFlagBankingDiscrepancy(
    expected,
    Number(amount),
    threshold
  );
  const diff = Math.abs(Number(amount) - expected);
  const finalDiscrepancy = Boolean(hasDiscrepancy) || autoDiscrepancy;
  let finalNote = discrepancyNote ?? null;
  if (autoDiscrepancy) {
    const autoMsg = `Expected UGX ${Math.round(expected).toLocaleString()} (same-day sales − cash expenses) vs recorded UGX ${Number(amount).toLocaleString()} (diff ${Math.round(diff).toLocaleString()}, threshold ${Math.round(threshold).toLocaleString()})`;
    finalNote = finalNote ? `${finalNote} — ${autoMsg}` : autoMsg;
  }

  const deposit = await prisma.bankDeposit.create({
    data: {
      date: depositDate,
      branchId,
      amount,
      bankName,
      referenceNumber,
      hasDiscrepancy: finalDiscrepancy,
      discrepancyNote: finalNote,
      recordedById: user.id,
    },
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
    },
  });

  await createAuditLog({
    action: "CREATE",
    entityType: "BankDeposit",
    entityId: deposit.id,
    userId: user.id,
    changes: {
      date,
      branchId,
      amount,
      bankName,
      referenceNumber,
      hasDiscrepancy: finalDiscrepancy,
      discrepancyNote: finalNote,
      expectedDeposit: expected,
    },
  });

  if (finalDiscrepancy) {
    const ed = await prisma.user.findFirst({
      where: { role: "EXECUTIVE_DIRECTOR", isActive: true },
      select: { id: true },
    });
    if (ed) {
      await createNotification({
        type: "BANKING_DISCREPANCY",
        title: "Banking Discrepancy Detected",
        message: `Discrepancy for ${deposit.branch.name} deposit of UGX ${Number(amount).toLocaleString()} on ${depositDate.toLocaleDateString()}.${finalNote ? ` ${finalNote}` : ""}`,
        urgency: "HIGH",
        userId: ed.id,
        relatedEntityType: "banking",
        relatedEntityId: deposit.id,
      });
    }
  }

  return NextResponse.json(deposit, { status: 201 });
}

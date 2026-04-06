import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import { createNotification } from "@/lib/utils/notifications";
import { advanceSchema } from "@/lib/validations/advance";

export async function GET() {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const advances = await prisma.advance.findMany({
    orderBy: { date: "desc" },
    include: {
      supplier: { select: { id: true, name: true } },
      owner: { select: { id: true, fullName: true } },
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json(advances);
}

export async function POST(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = advanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { recipientType, amount, date, purpose, supplierId, ownerId, branchId } = parsed.data;

  if (recipientType === "SUPPLIER" && !supplierId) {
    return NextResponse.json(
      { error: "supplierId is required for SUPPLIER advances" },
      { status: 400 }
    );
  }

  if (recipientType === "OWNER" && !ownerId) {
    return NextResponse.json(
      { error: "ownerId is required for OWNER advances" },
      { status: 400 }
    );
  }

  const advance = await prisma.advance.create({
    data: {
      recipientType,
      amount,
      date: new Date(date),
      purpose,
      isDeducted: false,
      supplierId: recipientType === "SUPPLIER" ? (supplierId ?? null) : null,
      ownerId: recipientType === "OWNER" ? (ownerId ?? null) : null,
      branchId: branchId ?? null,
      recordedById: user.id,
    },
    include: {
      supplier: { select: { id: true, name: true } },
      owner: { select: { id: true, fullName: true } },
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
    },
  });

  await createAuditLog({
    action: "CREATE",
    entityType: "Advance",
    entityId: advance.id,
    userId: user.id,
    changes: { recipientType, amount, date, purpose, supplierId, ownerId, branchId },
  });

  // Check if outstanding advances exceed 500,000 UGX threshold
  const recipientFilter =
    recipientType === "SUPPLIER" && supplierId
      ? { supplierId, recipientType: "SUPPLIER" as const }
      : recipientType === "OWNER" && ownerId
      ? { ownerId, recipientType: "OWNER" as const }
      : null;

  if (recipientFilter) {
    const [outstanding, settingsRow] = await Promise.all([
      prisma.advance.aggregate({
        _sum: { amount: true },
        where: { ...recipientFilter, isDeducted: false },
      }),
      prisma.systemSettings.findUnique({ where: { id: "singleton" } }),
    ]);
    const total = Number(outstanding._sum.amount ?? 0);
    const threshold = Number(settingsRow?.advanceWarningThreshold ?? 500000);
    if (total > threshold) {
      const recipientName =
        advance.supplier?.name ?? advance.owner?.fullName ?? "recipient";
      await createNotification({
        type: "ADVANCE_LIMIT",
        title: "Advance Limit Exceeded",
        message: `Outstanding advances for ${recipientName} have reached UGX ${total.toLocaleString()}, exceeding the UGX ${threshold.toLocaleString()} threshold.`,
        urgency: "MEDIUM",
        userId: user.id,
        relatedEntityType: "advance",
        relatedEntityId: advance.id,
      });
    }
  }

  return NextResponse.json(advance, { status: 201 });
}

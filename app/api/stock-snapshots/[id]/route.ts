import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";

const reviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  notes: z.string().optional(),
});

const editSchema = z.object({
  action: z.literal("EDIT"),
  physicalLiters: z.number().nonnegative("Liters cannot be negative"),
  notes: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json(
      { error: "Only the Executive Director can approve or reject stock snapshots." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await request.json();

  const snapshot = await prisma.stockSnapshot.findUnique({ where: { id } });
  if (!snapshot) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  // --- EDIT action ---
  if (body.action === "EDIT") {
    const parsed = editSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }
    const { physicalLiters, notes } = parsed.data;
    const varianceLiters = physicalLiters - Number(snapshot.computedLiters);

    const updated = await prisma.stockSnapshot.update({
      where: { id },
      data: {
        physicalLiters,
        varianceLiters,
        ...(notes !== undefined ? { notes: notes || null } : {}),
      },
      include: {
        branch: { select: { id: true, name: true } },
        recordedBy: { select: { id: true, fullName: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });

    await createAuditLog({
      action: "UPDATE",
      entityType: "StockSnapshot",
      entityId: id,
      userId: user.id,
      changes: { physicalLiters, varianceLiters, notes },
    });

    return NextResponse.json(updated);
  }

  // --- APPROVE / REJECT action ---
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  if (snapshot.status !== "PENDING") {
    const statusLabel = snapshot.status.charAt(0) + snapshot.status.slice(1).toLowerCase();
    return NextResponse.json(
      { error: `This snapshot has already been ${statusLabel}. Only PENDING snapshots can be approved or rejected.` },
      { status: 409 }
    );
  }

  const { action, notes } = parsed.data;
  const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
  const now = new Date();

  const updated = await prisma.stockSnapshot.update({
    where: { id },
    data: {
      status: newStatus,
      reviewedById: user.id,
      reviewedAt: now,
      ...(notes ? { notes } : {}),
    },
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
      reviewedBy: { select: { id: true, fullName: true } },
    },
  });

  await createAuditLog({
    action: "UPDATE",
    entityType: "StockSnapshot",
    entityId: id,
    userId: user.id,
    changes: { status: newStatus, reviewedAt: now },
  });

  return NextResponse.json(updated);
}

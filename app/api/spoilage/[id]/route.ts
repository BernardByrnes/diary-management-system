import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";

const reviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Only the Executive Director can approve spoilage." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const existing = await prisma.milkSpoilage.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "PENDING") {
    return NextResponse.json({ error: "Already reviewed." }, { status: 400 });
  }

  const updated = await prisma.milkSpoilage.update({
    where: { id },
    data: {
      status: parsed.data.action === "APPROVE" ? "APPROVED" : "REJECTED",
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
    include: {
      branch: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, fullName: true } },
      reviewedBy: { select: { id: true, fullName: true } },
    },
  });

  await createAuditLog({
    action: "UPDATE",
    entityType: "MilkSpoilage",
    entityId: id,
    userId: user.id,
    changes: { status: updated.status },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.milkSpoilage.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only reporter (manager) can delete, and only if still PENDING
  if (existing.reportedById !== user.id && user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (existing.status !== "PENDING" && user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Cannot delete a reviewed record." }, { status: 400 });
  }

  await prisma.milkSpoilage.delete({ where: { id } });

  await createAuditLog({
    action: "DELETE",
    entityType: "MilkSpoilage",
    entityId: id,
    userId: user.id,
    changes: {},
  });

  return NextResponse.json({ success: true });
}

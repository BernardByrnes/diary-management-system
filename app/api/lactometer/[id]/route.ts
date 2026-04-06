import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";
import { normalizeLactometerReading } from "@/lib/utils/lactometer-range";

const patchSchema = z.object({
  date: z.string().optional(),
  time: z.string().optional(),
  branchId: z.string().optional(),
  readingValue: z.coerce.number().positive().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (!["EXECUTIVE_DIRECTOR", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.lactometerReading.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Reading not found" }, { status: 404 });
  }

  if (user.role === "MANAGER") {
    const managed = await prisma.branchManager.findFirst({
      where: { managerId: user.id, branchId: existing.branchId },
    });
    if (!managed) {
      return NextResponse.json(
        { error: "You can only edit readings for your managed branches" },
        { status: 403 }
      );
    }
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { date, time, branchId, notes } = parsed.data;
  const readingValue = parsed.data.readingValue !== undefined
    ? normalizeLactometerReading(parsed.data.readingValue)
    : undefined;

  if (branchId && user.role === "MANAGER") {
    const managed = await prisma.branchManager.findFirst({
      where: { managerId: user.id, branchId },
    });
    if (!managed) {
      return NextResponse.json(
        { error: "You can only assign readings to your managed branches" },
        { status: 403 }
      );
    }
  }

  const updateData: Record<string, unknown> = {};
  if (date) updateData.date = new Date(date);
  if (time) updateData.time = time;
  if (branchId) updateData.branchId = branchId;
  if (readingValue !== undefined) updateData.readingValue = readingValue;
  if (notes !== undefined) updateData.notes = notes;

  const reading = await prisma.lactometerReading.update({
    where: { id },
    data: updateData,
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
    },
  });

  await createAuditLog({
    action: "UPDATE",
    entityType: "LactometerReading",
    entityId: id,
    userId: user.id,
    changes: updateData,
  });

  return NextResponse.json(reading);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.lactometerReading.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Reading not found" }, { status: 404 });
  }

  await prisma.lactometerReading.delete({ where: { id } });

  await createAuditLog({
    action: "DELETE",
    entityType: "LactometerReading",
    entityId: id,
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}

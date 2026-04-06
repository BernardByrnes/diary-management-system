import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import { isLactometerReadingInRange, normalizeLactometerReading } from "@/lib/utils/lactometer-range";
import { createNotification } from "@/lib/utils/notifications";
import { z } from "zod";

const readingSchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  branchId: z.string().min(1, "Branch is required"),
  readingValue: z.coerce.number().positive("Reading value must be positive"),
  notes: z.string().optional(),
});

export async function GET() {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  let where: Record<string, unknown> = {};

  if (user.role === "MANAGER") {
    const managed = await prisma.branchManager.findMany({
      where: { managerId: user.id },
      select: { branchId: true },
    });
    const ids = managed.map((b) => b.branchId);
    where = { branchId: { in: ids } };
  } else if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const readings = await prisma.lactometerReading.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
    },
    orderBy: [{ date: "desc" }, { time: "desc" }],
  });

  return NextResponse.json(readings);
}

export async function POST(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (!["EXECUTIVE_DIRECTOR", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = readingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { date, time, branchId, notes } = parsed.data;
  const readingValue = normalizeLactometerReading(parsed.data.readingValue);

  if (user.role === "MANAGER") {
    const managed = await prisma.branchManager.findFirst({
      where: { managerId: user.id, branchId },
    });
    if (!managed) {
      return NextResponse.json(
        { error: "You can only record readings for your managed branches" },
        { status: 403 }
      );
    }
  }

  const reading = await prisma.lactometerReading.create({
    data: {
      date: new Date(date),
      time,
      branchId,
      readingValue,
      notes: notes ?? null,
      recordedById: user.id,
    },
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, fullName: true } },
    },
  });

  await createAuditLog({
    action: "CREATE",
    entityType: "LactometerReading",
    entityId: reading.id,
    userId: user.id,
    changes: { date, time, branchId, readingValue, notes },
  });

  const settingsRow = await prisma.systemSettings.findUnique({
    where: { id: "singleton" },
  });
  const lactoMin = Number(settingsRow?.lactometerMin ?? 1.026);
  const lactoMax = Number(settingsRow?.lactometerMax ?? 1.032);
  const isOutOfRange = !isLactometerReadingInRange(
    readingValue,
    lactoMin,
    lactoMax
  );
  if (isOutOfRange) {
    const ed = await prisma.user.findFirst({
      where: { role: "EXECUTIVE_DIRECTOR", isActive: true },
      select: { id: true },
    });
    if (ed) {
      const direction =
        readingValue < lactoMin ? "below" : "above";
      await createNotification({
        type: "READING_OUT_OF_RANGE",
        title: "Lactometer Reading Out of Range",
        message: `${reading.branch.name} recorded a reading of ${readingValue.toFixed(3)} (${direction} the ${lactoMin.toFixed(3)}–${lactoMax.toFixed(3)} normal range) on ${new Date(date).toLocaleDateString()}.`,
        urgency: "HIGH",
        userId: ed.id,
        relatedEntityType: "lactometer",
        relatedEntityId: reading.id,
      });
    }
  }

  return NextResponse.json(reading, { status: 201 });
}

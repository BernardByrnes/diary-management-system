import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";

const SINGLETON_ID = "singleton";

async function getOrCreateSettings() {
  const existing = await prisma.systemSettings.findUnique({
    where: { id: SINGLETON_ID },
  });
  if (existing) return existing;
  return prisma.systemSettings.create({ data: { id: SINGLETON_ID } });
}

export async function GET() {
  const { error } = await getActiveUserOrError();
  if (error) return error;
  const settings = await getOrCreateSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;
  const role = user.role;
  if (role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    organizationName,
    currencySymbol,
    financialYearStartMonth,
    lactometerMin,
    lactometerMax,
    minReadingsPerWeek,
    advanceWarningThreshold,
    discrepancyThreshold,
    customExpenseCategories,
    publicHolidays,
    defaultRentCycle,
  } = body;

  const settings = await prisma.systemSettings.upsert({
    where: { id: SINGLETON_ID },
    update: {
      ...(organizationName !== undefined && { organizationName }),
      ...(currencySymbol !== undefined && { currencySymbol }),
      ...(financialYearStartMonth !== undefined && {
        financialYearStartMonth: Number(financialYearStartMonth),
      }),
      ...(lactometerMin !== undefined && { lactometerMin }),
      ...(lactometerMax !== undefined && { lactometerMax }),
      ...(minReadingsPerWeek !== undefined && {
        minReadingsPerWeek: Number(minReadingsPerWeek),
      }),
      ...(advanceWarningThreshold !== undefined && { advanceWarningThreshold }),
      ...(discrepancyThreshold !== undefined && { discrepancyThreshold }),
      ...(customExpenseCategories !== undefined && { customExpenseCategories }),
      ...(publicHolidays !== undefined && { publicHolidays }),
      ...(defaultRentCycle !== undefined && {
        defaultRentCycle:
          defaultRentCycle === "BI_ANNUAL" ? "BI_ANNUAL" : "ANNUAL",
      }),
    },
    create: { id: SINGLETON_ID },
  });

  await createAuditLog({
    action: "UPDATE",
    entityType: "SystemSettings",
    entityId: SINGLETON_ID,
    userId: user.id,
    changes: body,
  });

  return NextResponse.json(settings);
}

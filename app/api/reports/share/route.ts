import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Only the Executive Director can share reports." }, { status: 403 });
  }

  const body = await request.json();
  const { branchId, periodFrom, periodTo, periodLabel } = body;

  if (!branchId) {
    return NextResponse.json({ error: "branchId is required." }, { status: 400 });
  }

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    include: {
      owner: { select: { id: true, fullName: true } },
      managers: { include: { manager: { select: { id: true, fullName: true } } } },
    },
  });

  if (!branch) {
    return NextResponse.json({ error: "Branch not found." }, { status: 404 });
  }

  const reportUrl = `/dashboard/reports/branch-summary?branchId=${branchId}${periodFrom ? `&from=${periodFrom}` : ""}${periodTo ? `&to=${periodTo}` : ""}`;
  const period = periodFrom && periodTo
    ? `${periodFrom} – ${periodTo}`
    : periodLabel || "this month";

  const notificationTitle = `Branch Report: ${branch.name}`;
  const notificationMessage = `Executive Director has shared the ${period} Branch Summary report for ${branch.name}. Open the report to download the PDF.`;

  const recipientIds = [
    branch.owner.id,
    ...branch.managers.map((m) => m.manager.id),
  ];

  await prisma.notification.createMany({
    data: recipientIds.map((recipientId) => ({
      type: "REPORT_SHARED" as const,
      title: notificationTitle,
      message: notificationMessage,
      urgency: "MEDIUM" as const,
      userId: recipientId,
      relatedEntityType: "Branch",
      relatedEntityId: branchId,
    })),
  });

  return NextResponse.json({
    ok: true,
    sharedWith: {
      owner: branch.owner.fullName,
      managers: branch.managers.map((m) => m.manager.fullName),
      count: recipientIds.length,
    },
  });
}
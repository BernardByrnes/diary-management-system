import { prisma, withDbRetry } from "@/lib/db/prisma";
import type { NotificationType, NotificationUrgency } from "@prisma/client";

export async function createNotification({
  type,
  title,
  message,
  urgency,
  userId,
  relatedEntityType,
  relatedEntityId,
}: {
  type: NotificationType;
  title: string;
  message: string;
  urgency: NotificationUrgency;
  userId: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}) {
  // Deduplicate: don't create same type+entityId notification on same day
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (relatedEntityId) {
    const existing = await withDbRetry(() =>
      prisma.notification.findFirst({
        where: {
          userId,
          type,
          relatedEntityId,
          createdAt: { gte: today },
        },
      })
    );
    if (existing) return existing;
  }

  return await withDbRetry(() =>
    prisma.notification.create({
      data: {
        type,
        title,
        message,
        urgency,
        userId,
        relatedEntityType,
        relatedEntityId,
      },
    })
  );
}

// Find the Executive Director user id
async function getEDId(): Promise<string | null> {
  const ed = await withDbRetry(() =>
    prisma.user.findFirst({
      where: { role: "EXECUTIVE_DIRECTOR", isActive: true },
      select: { id: true },
    })
  );
  return ed?.id ?? null;
}

// Time-based checks called on dashboard load
export async function checkAndCreateNotifications(userId: string) {
  const now = new Date();
  const edId = await getEDId();
  if (!edId) return;

  // Only run heavy checks for ED (others get targeted notifications at point-of-action)
  if (userId !== edId) return;

  // Check: rent expense not recorded this month (run after 5th of month)
  if (now.getDate() > 5) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const rentExpense = await withDbRetry(() =>
      prisma.expense.findFirst({
        where: { category: "RENT", date: { gte: monthStart } },
      })
    );
    if (!rentExpense) {
      const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
      await createNotification({
        type: "RENT_DUE",
        title: "Rent Not Recorded",
        message: `No rent expense has been recorded for ${now.toLocaleString("default", { month: "long", year: "numeric" })}.`,
        urgency: "MEDIUM",
        userId: edId,
        relatedEntityType: "expense",
        relatedEntityId: monthKey,
      });
    }
  }

  // Check: overdue supplier payments
  const overduePayments = await withDbRetry(() =>
    prisma.supplierPayment.findMany({
      where: {
        status: { not: "PAID" },
        scheduledDate: { lt: now },
      },
      include: { supplier: { select: { name: true } } },
    })
  );
  for (const p of overduePayments) {
    await createNotification({
      type: "PAYMENT_OVERDUE",
      title: "Payment Overdue",
      message: `Payment to ${p.supplier.name} was scheduled for ${new Date(p.scheduledDate ?? p.periodEnd).toLocaleDateString()} and is overdue.`,
      urgency: "HIGH",
      userId: edId,
      relatedEntityType: "payment",
      relatedEntityId: p.id,
    });
  }

  // Check: payments due in next 3 days
  const in3Days = new Date(now);
  in3Days.setDate(in3Days.getDate() + 3);
  const dueSoon = await withDbRetry(() =>
    prisma.supplierPayment.findMany({
      where: {
        status: "APPROVED",
        scheduledDate: { gte: now, lte: in3Days },
      },
      include: { supplier: { select: { name: true } } },
    })
  );
  for (const p of dueSoon) {
    await createNotification({
      type: "PAYMENT_DUE",
      title: "Payment Due Soon",
      message: `Payment to ${p.supplier.name} is due on ${new Date(p.scheduledDate ?? p.periodEnd).toLocaleDateString()}.`,
      urgency: "MEDIUM",
      userId: edId,
      relatedEntityType: "payment",
      relatedEntityId: p.id,
    });
  }

  // Check: missing lactometer readings (if Friday or later in week)
  const dayOfWeek = now.getDay(); // 0=Sun, 5=Fri, 6=Sat
  if (dayOfWeek >= 5) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    const branches = await withDbRetry(() =>
      prisma.branch.findMany({
        where: { isActive: true },
        include: {
          managers: { include: { manager: { select: { id: true } } } },
        },
      })
    );
    for (const branch of branches) {
      const readingCount = await withDbRetry(() =>
        prisma.lactometerReading.count({
          where: { branchId: branch.id, date: { gte: weekStart } },
        })
      );
      if (readingCount < 2) {
        await createNotification({
          type: "MISSING_READINGS",
          title: "Missing Lactometer Readings",
          message: `${branch.name} has only ${readingCount} lactometer reading(s) this week (minimum 2 required).`,
          urgency: "HIGH",
          userId: edId,
          relatedEntityType: "branch",
          relatedEntityId: `${branch.id}-week-${weekStart.toISOString().split("T")[0]}`,
        });
        // Also notify managers of this branch
        for (const bm of branch.managers) {
          await createNotification({
            type: "MISSING_READINGS",
            title: "Missing Lactometer Readings",
            message: `${branch.name} has only ${readingCount} lactometer reading(s) this week (minimum 2 required).`,
            urgency: "HIGH",
            userId: bm.manager.id,
            relatedEntityType: "branch",
            relatedEntityId: `${branch.id}-week-${weekStart.toISOString().split("T")[0]}`,
          });
        }
      }
    }
  }
}

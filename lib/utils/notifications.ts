import { prisma, withDbRetry } from "@/lib/db/prisma";
import type { NotificationType, NotificationUrgency } from "@prisma/client";
import { sendTelegramAlert } from "./telegram";

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
  // Deduplicate: update if urgency increases or message changes; skip if identical
  if (relatedEntityId) {
    const existing = await withDbRetry(() =>
      prisma.notification.findFirst({
        where: { userId, type, relatedEntityId },
        select: { id: true, urgency: true, message: true, isRead: true },
      })
    );
    if (existing) {
      const urgencyOrder: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
      const urgencyEscalated = urgencyOrder[urgency] > urgencyOrder[existing.urgency];
      const messageChanged = existing.message !== message;
      if (!urgencyEscalated && !messageChanged) return existing;
      return withDbRetry(() =>
        prisma.notification.update({
          where: { id: existing.id },
          data: {
            urgency,
            message,
            title,
            // Re-surface as unread if escalating urgency
            isRead: urgencyEscalated ? false : existing.isRead,
            updatedAt: new Date(),
          },
        })
      );
    }
  }

  const notification = await withDbRetry(() =>
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

  // Send Telegram push for HIGH urgency notifications
  if (urgency === "HIGH") {
    await sendTelegramAlert(title, message);
  }

  return notification;
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

  // Check: rent expiring — notify at 60 days and 30 days before expiry, or never recorded
  const in60Days = new Date(now);
  in60Days.setDate(in60Days.getDate() + 60);
  const in30Days = new Date(now);
  in30Days.setDate(in30Days.getDate() + 30);

  const rentBranches = await withDbRetry(() =>
    prisma.branch.findMany({
      where: {
        isActive: true,
        OR: [
          { rentPaidUntil: null },
          { rentPaidUntil: { lte: in60Days } },
        ],
      },
      select: { id: true, name: true, rentPaidUntil: true },
    })
  );

  for (const branch of rentBranches) {
    if (!branch.rentPaidUntil) {
      // Never recorded — fire once per week using week key
      const weekKey = `rent-never-${branch.id}-week-${now.toISOString().slice(0, 10)}`;
      await createNotification({
        type: "RENT_DUE",
        title: "Rent Not Recorded",
        message: `Rent for ${branch.name} has never been recorded. Please log the current rent payment.`,
        urgency: "HIGH",
        userId: edId,
        relatedEntityType: "branch",
        relatedEntityId: weekKey,
      });
      continue;
    }

    const expiryDate = new Date(branch.rentPaidUntil);
    const expiryLabel = expiryDate.toLocaleDateString();
    const isWithin30 = expiryDate <= in30Days;

    if (isWithin30) {
      // 1-month warning
      const monthKey = `rent-30d-${branch.id}-${in30Days.toISOString().slice(0, 7)}`;
      await createNotification({
        type: "RENT_DUE",
        title: "Rent Expiring in 1 Month",
        message: `Rent for ${branch.name} expires on ${expiryLabel} — 1 month remaining. Please arrange the next payment.`,
        urgency: "HIGH",
        userId: edId,
        relatedEntityType: "branch",
        relatedEntityId: monthKey,
      });
    } else {
      // 2-month warning
      const monthKey = `rent-60d-${branch.id}-${in60Days.toISOString().slice(0, 7)}`;
      await createNotification({
        type: "RENT_DUE",
        title: "Rent Expiring in 2 Months",
        message: `Rent for ${branch.name} expires on ${expiryLabel} — 2 months remaining. Plan the next payment.`,
        urgency: "MEDIUM",
        userId: edId,
        relatedEntityType: "branch",
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

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { Bell, CheckCircle2 } from "lucide-react";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import { checkAndCreateNotifications } from "@/lib/utils/notifications";

export default async function NotificationsPage() {
  const session = await auth();
  const user = session!.user as { id: string; role: string };

  // Run time-based checks
  await checkAndCreateNotifications(user.id);

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serialized = notifications.map((n) => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }));

  const unreadCount = serialized.filter((n) => !n.isRead).length;

  // Group by urgency
  const highUrgency = serialized.filter((n) => n.urgency === "HIGH");
  const mediumUrgency = serialized.filter((n) => n.urgency === "MEDIUM");
  const lowUrgency = serialized.filter((n) => n.urgency === "LOW");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <Bell className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-400">{unreadCount} unread</p>
        </div>
      </div>

      {serialized.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <CheckCircle2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg text-gray-600">No notifications</p>
          <p className="text-sm text-gray-500 mt-1">You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* High urgency */}
          {highUrgency.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-red-600 mb-3">
                Urgent ({highUrgency.length})
              </h2>
              <NotificationsList notifications={highUrgency} />
            </section>
          )}

          {/* Medium urgency */}
          {mediumUrgency.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-yellow-600 mb-3">
                Moderate ({mediumUrgency.length})
              </h2>
              <NotificationsList notifications={mediumUrgency} />
            </section>
          )}

          {/* Low urgency */}
          {lowUrgency.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-blue-600 mb-3">
                Info ({lowUrgency.length})
              </h2>
              <NotificationsList notifications={lowUrgency} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

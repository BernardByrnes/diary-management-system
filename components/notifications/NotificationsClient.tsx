"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils/date";
import { AlertTriangle, Info, CheckCheck, CheckCircle, Bell, Trash2 } from "lucide-react";

interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  message: string;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  isRead: boolean;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
}

interface Props {
  initialNotifications: NotificationRecord[];
}

type FilterTab = "ALL" | "UNREAD" | "HIGH";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return formatDate(iso);
}

const URGENCY_ICON_CLASS: Record<NotificationRecord["urgency"], string> = {
  HIGH: "text-red-500",
  MEDIUM: "text-amber-500",
  LOW: "text-gray-400",
};

const URGENCY_ROW_CLASS: Record<NotificationRecord["urgency"], string> = {
  HIGH: "border-l-2 border-l-red-400",
  MEDIUM: "border-l-2 border-l-amber-400",
  LOW: "border-l-0",
};

const URGENCY_BADGE: Record<NotificationRecord["urgency"], string> = {
  HIGH: "bg-red-50 text-red-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  LOW: "bg-gray-100 text-gray-500",
};

export default function NotificationsClient({ initialNotifications }: Props) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationRecord[]>(initialNotifications);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [markingAll, setMarkingAll] = useState(false);
  const [clearing, setClearing] = useState<"read" | "all" | null>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filtered = notifications.filter((n) => {
    if (activeTab === "UNREAD") return !n.isRead;
    if (activeTab === "HIGH") return n.urgency === "HIGH";
    return true;
  });

  const handleMarkRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    } catch {
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
      );
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await fetch("/api/notifications/mark-all-read", { method: "PATCH" });
    } catch {
      // Revert on failure
      setNotifications(initialNotifications);
    } finally {
      setMarkingAll(false);
    }
  }, [unreadCount, initialNotifications]);

  const readCount = notifications.filter((n) => n.isRead).length;

  const handleDeleteRead = useCallback(async () => {
    if (readCount === 0) return;
    setClearing("read");
    const prev = notifications;
    setNotifications((list) => list.filter((n) => !n.isRead));
    try {
      const res = await fetch("/api/notifications?scope=read", { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setNotifications(prev);
    } finally {
      setClearing(null);
    }
  }, [readCount, router]);

  const handleClearAll = useCallback(async () => {
    if (notifications.length === 0) return;
    if (
      !window.confirm(
        "Delete all notifications? This cannot be undone."
      )
    ) {
      return;
    }
    setClearing("all");
    const prev = notifications;
    setNotifications([]);
    try {
      const res = await fetch("/api/notifications?scope=all", { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setNotifications(prev);
    } finally {
      setClearing(null);
    }
  }, [notifications, router]);

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: "ALL", label: "All", count: notifications.length },
    { key: "UNREAD", label: "Unread", count: unreadCount },
    { key: "HIGH", label: "High Priority", count: notifications.filter((n) => n.urgency === "HIGH").length },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-bold ${
                    activeTab === tab.key ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || markingAll || clearing !== null}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            {markingAll ? "Marking..." : "Mark all read"}
          </button>
          <button
            type="button"
            onClick={handleDeleteRead}
            disabled={readCount === 0 || clearing !== null}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
            title="Remove read notifications from the list"
          >
            <Trash2 className="w-4 h-4" />
            {clearing === "read" ? "Removing…" : "Remove read"}
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={notifications.length === 0 || clearing !== null}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
            title="Delete every notification"
          >
            <Trash2 className="w-4 h-4" />
            {clearing === "all" ? "Clearing…" : "Clear all"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide w-8">
                {/* Urgency icon column */}
              </th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                Notification
              </th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">
                Urgency
              </th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden sm:table-cell">
                Time
              </th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                      <Bell className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      {activeTab === "UNREAD"
                        ? "No unread notifications"
                        : activeTab === "HIGH"
                        ? "No high priority notifications"
                        : "No notifications yet"}
                    </p>
                    {activeTab === "UNREAD" && (
                      <p className="text-xs text-gray-400 mt-1">You&apos;re all caught up!</p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((n) => (
                <tr
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                  className={`transition-colors ${URGENCY_ROW_CLASS[n.urgency]} ${
                    n.isRead
                      ? "bg-white hover:bg-gray-50/50"
                      : "bg-blue-50/30 hover:bg-blue-50/60 cursor-pointer"
                  }`}
                >
                  {/* Urgency icon */}
                  <td className="pl-5 pr-2 py-3.5">
                    {n.urgency === "HIGH" || n.urgency === "MEDIUM" ? (
                      <AlertTriangle
                        className={`w-4 h-4 flex-shrink-0 ${URGENCY_ICON_CLASS[n.urgency]}`}
                      />
                    ) : (
                      <Info className={`w-4 h-4 flex-shrink-0 ${URGENCY_ICON_CLASS[n.urgency]}`} />
                    )}
                  </td>

                  {/* Title + message */}
                  <td className="px-3 py-3.5 max-w-xs lg:max-w-sm xl:max-w-md">
                    <p
                      className={`font-medium leading-tight ${
                        n.isRead ? "text-gray-600" : "text-gray-900"
                      }`}
                    >
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                  </td>

                  {/* Urgency badge */}
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        URGENCY_BADGE[n.urgency]
                      }`}
                    >
                      {n.urgency.charAt(0) + n.urgency.slice(1).toLowerCase()}
                    </span>
                  </td>

                  {/* Time */}
                  <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap hidden sm:table-cell">
                    {timeAgo(n.createdAt)}
                  </td>

                  {/* Read status */}
                  <td className="px-5 py-3.5">
                    {n.isRead ? (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Read</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                        <span className="text-xs font-medium text-blue-600 hidden sm:inline">New</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 px-1">
        {filtered.length} of {notifications.length} notifications
        {unreadCount > 0 && (
          <span className="ml-2 text-blue-500 font-medium">· {unreadCount} unread</span>
        )}
      </p>
    </div>
  );
}

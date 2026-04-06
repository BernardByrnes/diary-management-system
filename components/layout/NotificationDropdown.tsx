'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  AlertTriangle,
  DollarSign,
  FileWarning,
  ArrowRightLeft,
  Gauge,
  CheckCircle2,
  X
} from 'lucide-react'

type Notification = {
  id: string
  type: string
  title: string
  message: string
  urgency: 'HIGH' | 'MEDIUM' | 'LOW'
  isRead: boolean
  relatedEntityType?: string
  relatedEntityId?: string
  createdAt: Date
}

export function NotificationDropdown({
  userId,
  onClose
}: {
  userId: string
  onClose: () => void
}) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const response = await fetch('/api/notifications?limit=10')
        const data = await response.json()
        setNotifications(data.notifications)
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [])

  const iconMap: Record<string, any> = {
    PAYMENT_DUE: DollarSign,
    PAYMENT_OVERDUE: DollarSign,
    BANKING_DISCREPANCY: AlertTriangle,
    MISSING_READINGS: FileWarning,
    TRANSFER_PENDING: ArrowRightLeft,
    READING_OUT_OF_RANGE: Gauge
  }

  const urgencyColors = {
    HIGH: 'border-l-red-500 bg-red-50 dark:bg-red-950/10',
    MEDIUM: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/10',
    LOW: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/10'
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      })

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      )
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      })

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="absolute right-0 mt-2 w-96 max-h-[500px] overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Notifications
        </h3>

        <div className="flex items-center gap-2">
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Mark all read
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications list */}
      <div className="overflow-y-auto max-h-[400px]">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400">
              No notifications
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.map((notification) => {
              const Icon = iconMap[notification.type] || AlertTriangle
              const urgencyClass = urgencyColors[notification.urgency]

              return (
                <div
                  key={notification.id}
                  className={`
                    p-4
                    border-l-4
                    ${urgencyClass}
                    ${notification.isRead ? 'opacity-60' : ''}
                    hover:bg-gray-50 dark:hover:bg-gray-700/50
                    transition-colors
                    cursor-pointer
                  `}
                  onClick={() => {
                    handleMarkAsRead(notification.id)
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`
                      flex-shrink-0
                      w-8 h-8
                      rounded-full
                      flex items-center justify-center
                      ${notification.urgency === 'HIGH'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        : notification.urgency === 'MEDIUM'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      }
                    `}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`
                        text-sm
                        ${notification.isRead ? 'font-normal' : 'font-semibold'}
                        text-gray-900 dark:text-gray-100
                      `}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {formatTimeAgo(new Date(notification.createdAt))}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!notification.isRead && (
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center">
          <Link
            href="/dashboard/notifications"
            onClick={onClose}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all notifications
          </Link>
        </div>
      )}
    </motion.div>
  )
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`

  return date.toLocaleDateString()
}

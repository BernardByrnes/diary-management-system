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
  X,
  type LucideIcon
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
        setNotifications(Array.isArray(data) ? data : data.notifications || [])
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [])

  const iconMap: Record<string, LucideIcon> = {
    PAYMENT_DUE: DollarSign,
    PAYMENT_OVERDUE: DollarSign,
    BANKING_DISCREPANCY: AlertTriangle,
    MISSING_READINGS: FileWarning,
    TRANSFER_PENDING: ArrowRightLeft,
    READING_OUT_OF_RANGE: Gauge
  }

  const iconColors = {
    HIGH: 'bg-red-100 text-red-600',
    MEDIUM: 'bg-yellow-100 text-yellow-600',
    LOW: 'bg-blue-100 text-blue-600'
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      })

      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n))
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

  const renderHighlightedMessage = (message: string) => {
    const parts = message.split(/(\d+(?:\.\d+)?|[A-Z][a-zA-Z0-9_-]+)/g)
    
    return parts.map((part, i) => {
      if (/^\d+(?:\.\d+)?$/.test(part)) {
        return <span key={i} className="font-semibold text-gray-900">{part}</span>
      }
      if (/^(success|completed|approved|paid|clear|done)$/i.test(part)) {
        return <span key={i} className="text-green-600">{part}</span>
      }
      if (/^(error|failed|overdue|missing|discrepancy)/i.test(part)) {
        return <span key={i} className="text-red-600">{part}</span>
      }
      if (/^[A-Z][a-zA-Z0-9_-]{2,}$/.test(part)) {
        return <span key={i} className="font-medium text-gray-900">{part}</span>
      }
      return part
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">
          Notifications
        </h3>

        <div className="flex items-center gap-2">
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-blue-600 hover:underline"
            >
              Mark all read
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[400px]">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">
              No notifications
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => {
              const Icon = iconMap[notification.type] || AlertTriangle
              const iconColorClass = iconColors[notification.urgency]

              return (
                <div
                  key={notification.id}
                  className={`
                    p-4
                    bg-white
                    hover:bg-gray-50
                    transition-colors duration-200
                    cursor-pointer
                    ${notification.isRead ? 'opacity-60' : ''}
                  `}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${iconColorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        )}
                        <span className="text-xs text-gray-500 ml-auto">
                          {formatTimeAgo(new Date(notification.createdAt))}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 leading-relaxed mt-1 line-clamp-2">
                        {renderHighlightedMessage(notification.message)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 text-center">
          <Link
            href="/dashboard/notifications"
            onClick={onClose}
            className="text-sm text-blue-600 hover:underline"
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
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  DollarSign,
  FileWarning,
  ArrowRightLeft,
  Gauge
} from 'lucide-react'

type Notification = {
  id: string
  type: string
  title: string
  message: string
  urgency: 'HIGH' | 'MEDIUM' | 'LOW'
  isRead: boolean
  createdAt: string
}

export function NotificationsList({
  notifications
}: {
  notifications: Notification[]
}) {
  const [items, setItems] = useState(notifications)

  const iconMap: Record<string, any> = {
    PAYMENT_DUE: DollarSign,
    PAYMENT_OVERDUE: DollarSign,
    BANKING_DISCREPANCY: AlertTriangle,
    MISSING_READINGS: FileWarning,
    TRANSFER_PENDING: ArrowRightLeft,
    READING_OUT_OF_RANGE: Gauge
  }

  const urgencyColors = {
    HIGH: 'border-l-red-500',
    MEDIUM: 'border-l-yellow-500',
    LOW: 'border-l-blue-500'
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      })

      setItems(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      )
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  return (
    <div className="space-y-2">
      {items.map((notification, index) => {
        const Icon = iconMap[notification.type] || AlertTriangle
        const urgencyClass = urgencyColors[notification.urgency]

        return (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`
              bg-white dark:bg-gray-800
              rounded-lg
              p-4
              border-l-4
              ${urgencyClass}
              ${notification.isRead ? 'opacity-60' : ''}
              shadow-sm hover:shadow-md
              transition-all duration-200
            `}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={`
                flex-shrink-0
                w-10 h-10
                rounded-full
                flex items-center justify-center
                ${notification.urgency === 'HIGH'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  : notification.urgency === 'MEDIUM'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                }
              `}>
                <Icon className="w-5 h-5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`
                    text-sm
                    ${notification.isRead ? 'font-normal' : 'font-semibold'}
                    text-gray-900 dark:text-gray-100
                  `}>
                    {notification.title}
                  </p>

                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {formatDate(new Date(notification.createdAt))}
                  </span>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {notification.message}
                </p>

                {!notification.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

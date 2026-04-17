'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  DollarSign,
  FileWarning,
  ArrowRightLeft,
  Gauge,
  type LucideIcon
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

      setItems(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n))
    } catch (error) {
      console.error('Failed to mark as read:', error)
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
    <div className="space-y-3">
      {items.map((notification, index) => {
        const Icon = iconMap[notification.type] || AlertTriangle
        const iconColorClass = iconColors[notification.urgency]

        return (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`
              bg-white
              rounded-xl
              p-4
              border border-gray-200
              shadow-sm
              ${notification.isRead ? 'opacity-60' : ''}
              hover:bg-gray-50
              transition-colors duration-200
            `}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${iconColorClass}`}>
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold text-gray-900 ${notification.isRead ? 'font-normal' : ''}`}>
                    {notification.title}
                  </p>
                  {!notification.isRead && (
                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  )}
                  <span className="text-xs text-gray-500 ml-auto">
                    {formatDate(new Date(notification.createdAt))}
                  </span>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed mt-1">
                  {renderHighlightedMessage(notification.message)}
                </p>

                {!notification.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="text-xs text-blue-600 hover:underline mt-2"
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
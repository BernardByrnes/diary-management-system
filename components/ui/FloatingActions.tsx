'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Plus, X, Milk, ShoppingCart, Receipt, Landmark } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type Action = {
  label: string
  icon: React.ElementType
  href: string
  color: string // Tailwind color class
}

const actions: Action[] = [
  {
    label: 'Record Milk Supply',
    icon: Milk,
    href: '/dashboard/milk-supply',
    color: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    label: 'Record Sale',
    icon: ShoppingCart,
    href: '/dashboard/sales',
    color: 'bg-green-500 hover:bg-green-600'
  },
  {
    label: 'Add Expense',
    icon: Receipt,
    href: '/dashboard/expenses',
    color: 'bg-orange-500 hover:bg-orange-600'
  },
  {
    label: 'Record Deposit',
    icon: Landmark,
    href: '/dashboard/banking',
    color: 'bg-purple-500 hover:bg-purple-600'
  }
]

export function FloatingActions() {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  // Keyboard navigation through menu items (ArrowUp/Down/Enter)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setFocusedIndex((prev) => (prev + 1) % actions.length)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setFocusedIndex((prev) => (prev - 1 + actions.length) % actions.length)
      } else if (event.key === 'Enter' && focusedIndex >= 0) {
        event.preventDefault()
        // Navigate to focused action
        window.location.href = actions[focusedIndex].href
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, focusedIndex])

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50">
      {/* Action menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-20 right-0 flex flex-col gap-3"
          >
            {actions.map((action, index) => {
              const Icon = action.icon

              return (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={action.href}
                    onClick={() => setIsOpen(false)}
                    className={`
                      flex items-center gap-3
                      ${action.color}
                      text-white
                      px-4 py-3
                      rounded-full
                      shadow-lg
                      hover:shadow-xl
                      transition-all duration-200
                      whitespace-nowrap
                      group
                      ${focusedIndex === index ? 'ring-2 ring-white' : ''}
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium pr-1">{action.label}</span>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-14 h-14
          rounded-full
          ${isOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}
          text-white
          shadow-lg
          hover:shadow-xl
          flex items-center justify-center
          transition-all duration-200
          focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Plus className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  )
}

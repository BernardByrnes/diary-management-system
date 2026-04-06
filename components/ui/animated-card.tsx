'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

type AnimatedCardProps = {
  children: ReactNode
  className?: string
  delay?: number // for staggered animation
}

export function AnimatedCard({ children, className = '', delay = 0 }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{
        y: -4,
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

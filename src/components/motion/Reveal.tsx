import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { EASE_OUT } from './easing'

interface RevealProps {
  children: ReactNode
  /** Seconds to wait once in view, for staggering siblings. */
  delay?: number
  className?: string
}

/**
 * Scroll-triggered entrance: a short rise and fade the first time the block
 * enters the viewport, then it stays put. `MotionConfig reducedMotion="user"`
 * at the root drops the rise for users who ask for less motion.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.7, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  )
}

import {
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { EASE } from './easing'

/** A figure that glides to each new value; prints plainly under reduced motion. */
export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number
  format: (v: number) => string
  className?: string
}) {
  const reduce = useReducedMotion()
  const spring = useSpring(value, { stiffness: 90, damping: 20, mass: 0.8 })
  const text = useTransform(spring, format)
  useEffect(() => {
    spring.set(value)
  }, [spring, value])
  if (reduce) return <span className={className}>{format(value)}</span>
  return <motion.span className={className}>{text}</motion.span>
}

/**
 * Words rise out of a mask one after another — the headline entrance.
 * Each word keeps its own line box, so wrapping is decided by the browser.
 */
export function MaskedWords({
  text,
  className,
  delay = 0,
  inView = false,
  highlight,
}: {
  text: string
  className?: string
  delay?: number
  /** Play when scrolled into view rather than on mount. */
  inView?: boolean
  /** Words (exact match) that take the underline highlight. */
  highlight?: string[]
}) {
  const words = text.split(' ')
  const play = inView
    ? { whileInView: 'show', viewport: { once: true, amount: 0.6 } }
    : { animate: 'show' }
  return (
    <motion.span
      className={className}
      initial="hide"
      {...play}
      transition={{ staggerChildren: 0.055, delayChildren: delay }}
    >
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-top">
          <motion.span
            className={`inline-block ${highlight?.includes(word) ? 'word-highlight' : ''}`}
            variants={{
              hide: { y: '105%' },
              show: { y: '0%', transition: { duration: 0.9, ease: EASE } },
            }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 && ' '}
        </span>
      ))}
    </motion.span>
  )
}

/** A block that rises into place the first time it scrolls into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
}: {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

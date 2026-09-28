import { motion, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { useEffect } from 'react'

interface AnimatedNumberProps {
  value: number
  format: (value: number) => string
  className?: string
}

/**
 * A figure that glides to its new value instead of snapping. It counts up
 * from zero on mount, and under reduced motion it simply prints the value.
 */
export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const reduce = useReducedMotion()
  const spring = useSpring(0, { stiffness: 120, damping: 22, mass: 0.7 })
  const text = useTransform(spring, format)

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  if (reduce) return <span className={className}>{format(value)}</span>
  return <motion.span className={className}>{text}</motion.span>
}

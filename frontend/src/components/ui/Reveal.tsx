import { motion, useReducedMotion } from 'motion/react'

// Content rises in as it enters the viewport, with a small overshoot; static under reduced motion.
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay, ease: [0.34, 1.4, 0.64, 1] }}
    >
      {children}
    </motion.div>
  )
}

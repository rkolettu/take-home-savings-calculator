import { ArrowLeftRight, ChartSpline } from 'lucide-react'
import type { MotionValue } from 'motion/react'
import { motion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { MaskedWords, Reveal } from './motion'

/** A sentence that fills in word by word as it scrolls through the viewport. */
export function ScrollFillLine({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 45%'] })
  const words = text.split(' ')
  return (
    <section className="py-28 sm:py-40">
      <div className="landing-container">
        <p
          ref={ref}
          className="max-w-5xl text-[34px] font-bold leading-[1.08] tracking-[-0.045em] sm:text-[52px] lg:text-[64px]"
        >
          <span className="sr-only">{text}</span>
          <span aria-hidden>
            {words.map((w, i) => (
              <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
                {w}
              </Word>
            ))}
          </span>
        </p>
      </div>
    </section>
  )
}

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const color = useTransform(progress, range, ['#d6d1c7', '#171717'])
  return (
    <>
      <motion.span style={{ color }}>{children}</motion.span>{' '}
    </>
  )
}

/** Heading for the full calculator, which follows straight after the hero. */
export function CalculatorIntro() {
  return (
    <section data-chapter="01" data-chapter-name="The calculator" className="border-t border-[var(--line)] pb-8 pt-16 sm:pt-20">
      <div className="landing-container">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
          01 · The calculator
        </div>
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12">
          <div>
            <h2 className="text-[40px] font-bold leading-[0.98] tracking-[-0.05em] text-[var(--ink)] sm:text-[56px] lg:text-[64px]">
              <MaskedWords text="Run your numbers." inView />
            </h2>
            <Reveal className="mt-4 max-w-xl text-base leading-7 text-[var(--ink-2)]" y={16}>
              Every figure above comes from here. Change your filing status, edit any cost line, compare
              metros side by side, or project decades ahead with raises, moves and milestones.
            </Reveal>
          </div>
          <Reveal className="flex flex-wrap gap-3 lg:pb-1" y={16}>
            <button type="button" className="btn-line" onClick={() => window.dispatchEvent(new Event('open-compare'))}>
              <ArrowLeftRight className="size-4" />
              Compare metros
            </button>
            <a href="#projection" className="btn-line">
              <ChartSpline className="size-4" />
              Build a projection
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

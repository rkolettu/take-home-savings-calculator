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

/** Hand-off from the story to the full calculator. */
export function WorkbenchIntro() {
  return (
    <section data-chapter="04" data-chapter-name="Run the numbers" className="border-t border-[var(--line)] pb-10 pt-24 sm:pt-32">
      <div className="landing-container">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
          04 · The workbench
        </div>
        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end">
          <h2 className="text-[40px] font-bold leading-[0.98] tracking-[-0.05em] text-[var(--ink)] sm:text-[64px] lg:text-[76px]">
            <MaskedWords text="Now run it for real." inView />
          </h2>
          <Reveal className="lg:pb-3">
            <p className="max-w-md text-base leading-7 text-[var(--ink-2)]">
              Everything above is live in the calculator below. Change your filing status, edit any cost
              line, compare metros side by side, or project decades ahead with raises, moves and milestones.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className="btn-line" onClick={() => window.dispatchEvent(new Event('open-compare'))}>
                <ArrowLeftRight className="size-4" />
                Compare metros
              </button>
              <a href="#projection" className="btn-line">
                <ChartSpline className="size-4" />
                Build a projection
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

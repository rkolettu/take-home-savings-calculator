import { ArrowDown, ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo } from 'react'
import { METROS } from '../../data/metroData'
import { paycheckFrom } from '../../lib/paycheck'
import { Breakdown } from './Breakdown'
import { EASE } from './easing'
import { MaskedWords } from './motion'
import { Sentence } from './Sentence'
import type { LandingModel } from './types'

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 1, ease: EASE, delay },
})

export function Hero({ model, storyId }: { model: LandingModel; storyId: string }) {
  const paycheck = useMemo(
    () => paycheckFrom(model.takeHome, model.costs),
    [model.takeHome, model.costs],
  )
  const kept = paycheck.groups[3].amount

  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden">
      <div className="landing-container pb-20 pt-12 sm:pt-16 lg:pb-28">
        <motion.div
          {...fade(0)}
          className="flex items-center justify-between font-mono text-[11px] font-medium uppercase tracking-[0.16em]"
        >
          <span className="text-[var(--accent)]">Take-home savings / {METROS.length} U.S. metros</span>
          <span className="hidden text-[var(--muted)] sm:inline">2026 tax year</span>
        </motion.div>

        <h1
          id="hero-heading"
          className="mt-6 text-[44px] font-bold leading-[0.95] tracking-[-0.055em] text-[var(--ink)] sm:text-[64px] lg:text-[84px]"
        >
          <MaskedWords text="Your salary means something" delay={0.1} />{' '}
          <br className="hidden lg:block" />
          <MaskedWords text="different in every city." delay={0.35} highlight={['every', 'city.']} />
        </h1>

        <div className="mt-12 grid gap-12 lg:mt-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:grid-rows-[auto_1fr] lg:gap-x-20 lg:gap-y-10">
          <motion.div {...fade(0.55)}>
            <Sentence model={model} kept={kept} shortfall={paycheck.shortfall} />
          </motion.div>

          <motion.div {...fade(0.8)} className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <Breakdown paycheck={paycheck} entrance />
          </motion.div>

          <motion.div {...fade(0.7)} className="flex flex-col">
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={model.onOpenCalculator} className="btn-ink">
                Open the full calculator
                <ArrowDown className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => document.getElementById(storyId)?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-line"
              >
                See where it goes
                <ArrowRight className="size-4" />
              </button>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)] lg:mt-auto lg:pt-10">
              {['Free', 'No account', '2026 federal, state & local tax', 'HUD · EIA · BLS data'].map((item, i) => (
                <li key={item} className="flex items-center gap-3">
                  {i > 0 && <span aria-hidden className="text-[var(--line-strong)]">/</span>}
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

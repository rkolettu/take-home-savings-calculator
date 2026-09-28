import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { useMemo, useRef, useState } from 'react'
import { HOUSING_TIER_HINTS } from '../../data/metroData'
import { percent, usd } from '../../lib/format'
import type { PaycheckGroupKey } from '../../lib/paycheck'
import { dotCounts, paycheckFrom } from '../../lib/paycheck'
import { EASE } from './easing'
import { FIELD_LABELS, GROUP_TONES } from './landingTheme'
import { AnimatedNumber } from './motion'
import { PaycheckField } from './PaycheckField'
import type { LandingModel } from './types'
import { useMedia } from './useMedia'

const STEPS: { label: string; detached: PaycheckGroupKey[] }[] = [
  { label: 'Gross pay', detached: [] },
  { label: 'Taxes', detached: ['tax'] },
  { label: 'Rent', detached: ['tax', 'housing'] },
  { label: 'Living costs', detached: ['tax', 'housing', 'living'] },
  { label: 'Kept', detached: ['tax', 'housing', 'living', 'kept'] },
]

/**
 * One paycheck, dissected. The section is several screens tall and its stage
 * is pinned with plain `position: sticky`, so the page scrolls natively —
 * scroll position only chooses which step of the story is showing.
 */
export function PaycheckStory({ model, id }: { model: LandingModel; id: string }) {
  const ref = useRef<HTMLElement>(null)
  const desktop = useMedia('(min-width: 768px)')
  const [step, setStep] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    setStep(Math.min(STEPS.length - 1, Math.max(0, Math.floor(p * STEPS.length * 0.999))))
  })

  const paycheck = useMemo(() => paycheckFrom(model.takeHome, model.costs), [model.takeHome, model.costs])
  const maxDots = desktop ? 1_400 : 700
  const counts = useMemo(() => dotCounts(paycheck, maxDots), [paycheck, maxDots])
  const [tax, housing, living, kept] = paycheck.groups
  const { metro, takeHome, costs } = model

  const detached = useMemo(() => {
    const set = new Set(STEPS[step].detached)
    return { tax: set.has('tax'), housing: set.has('housing'), living: set.has('living'), kept: set.has('kept') }
  }, [step])

  const remaining =
    paycheck.gross -
    paycheck.groups
      .filter((g) => g.key !== 'kept' && detached[g.key])
      .reduce((s, g) => s + g.amount, 0)

  const stateLine =
    takeHome.state + takeHome.local === 0
      ? `${metro.stateCode} takes no state income tax from wages`
      : `state and local income tax ${usd((takeHome.state + takeHome.local) / 12)}`

  const copy = [
    {
      title: <>It starts as <Num v={paycheck.gross} />.</>,
      body: `${usd(model.gross)} a year is ${usd(paycheck.gross)} a month. Each dot is ${usd(counts.unit)} of it, before anything is taken out.`,
    },
    {
      title: <>Taxes take <Num v={tax.amount} />.</>,
      body: `Federal income tax ${usd(tax.parts[0].amount)}, Social Security and Medicare ${usd(tax.parts[1].amount)}, and ${stateLine}. In ${metro.city}, that is ${percent(tax.amount / paycheck.gross)} of every paycheck.`,
    },
    {
      title: <>Rent takes <Num v={housing.amount} />.</>,
      body: `${HOUSING_TIER_HINTS[model.housingTier]} in ${metro.city}, a benchmark re-indexed each year to HUD Fair Market Rents. ${
        housing.amount >= Math.max(tax.amount, living.amount)
          ? 'It is the largest cut after all, and the one that moves most between cities.'
          : 'Of all the lines, it is the one that moves most between cities.'
      }`,
    },
    {
      title: <>Everything else takes <Num v={living.amount} />.</>,
      body: `Utilities ${usd(costs.utilities)}, groceries ${usd(costs.groceries)}, transport ${usd(costs.transport)} and discretionary spending ${usd(costs.discretionary)} — per-metro planning benchmarks you can edit in the calculator above.`,
    },
    paycheck.shortfall > 0
      ? {
          title: <>You are <Num v={paycheck.shortfall} tone="critical" /> short.</>,
          body: `At this salary, costs in ${metro.city} run past take-home pay every month. Try a cheaper housing setup, a higher salary, or another city.`,
        }
      : {
          title: <>You keep <Num v={kept.amount} tone="accent" />.</>,
          body: `${percent(kept.amount / paycheck.gross)} of gross pay, ${percent(kept.amount / paycheck.net)} of take-home — the part that can actually build wealth. The same salary somewhere else leaves a very different number.`,
        },
  ]

  return (
    <section
      ref={ref}
      id={id}
      data-chapter="02"
      data-chapter-name="Where it goes"
      aria-label="Where one paycheck goes"
      className="relative scroll-mt-0 border-t border-[var(--line)]"
      style={{ height: `${STEPS.length * 85 + 15}vh` }}
    >
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden">
        <div className="landing-container flex flex-1 flex-col justify-center pb-8 pt-8 sm:pt-20 lg:pb-12 lg:pt-24">
          <div className="flex items-center justify-between gap-6">
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
              02 · Follow one paycheck
            </span>
            <ol className="hidden items-center gap-5 md:flex" aria-label="Steps">
              {STEPS.map((s, i) => (
                <li
                  key={s.label}
                  aria-current={i === step ? 'step' : undefined}
                  className="flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] transition-colors duration-500"
                  style={{ color: i <= step ? 'var(--ink)' : 'var(--line-strong)' }}
                >
                  <span className="tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  {s.label}
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-4 h-px w-full overflow-hidden bg-[var(--line)]">
            <motion.div className="h-full origin-left bg-[var(--ink)]" style={{ scaleX: scrollYProgress }} />
          </div>

          <div className="mt-10 grid flex-1 gap-8 md:mt-14 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center md:gap-16">
            <div className="order-2 min-h-[210px] md:order-1 md:min-h-[300px]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.55, ease: EASE }}
                >
                  <div className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                    <span className="text-[var(--ink)]">{String(step + 1).padStart(2, '0')}</span> / 05 · {STEPS[step].label}
                  </div>
                  <h2 className="mt-4 text-[36px] font-bold leading-[1] tracking-[-0.05em] text-[var(--ink)] sm:text-[52px] lg:text-[60px]">
                    {copy[step].title}
                  </h2>
                  <p className="mt-5 max-w-md text-[15px] leading-7 text-[var(--ink-2)] sm:text-base">
                    {copy[step].body}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="order-1 md:order-2">
              <div className="flex items-end justify-between">
                <div>
                  <div className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                    {step === STEPS.length - 1 ? 'Kept each month' : 'Still in the paycheck'}
                  </div>
                  <AnimatedNumber
                    value={step === STEPS.length - 1 ? kept.amount : remaining}
                    format={usd}
                    className="mt-1 block text-[32px] font-semibold leading-none tracking-[-0.045em] tabular-nums sm:text-[44px]"
                  />
                </div>
                <ul className="hidden gap-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] sm:flex">
                  {(['tax', 'housing', 'living', 'kept'] as const).map((k) => (
                    <li key={k} className="flex items-center gap-1.5 transition-opacity duration-500" style={{ opacity: detached[k] ? 1 : 0.3 }}>
                      <span className="size-1.5 rounded-full" style={{ background: GROUP_TONES[k].swatch }} />
                      {FIELD_LABELS[k]}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6">
                <PaycheckField
                  counts={counts}
                  detached={detached}
                  maxDots={maxDots}
                  rows={desktop ? 28 : 18}
                  height={desktop ? 340 : 170}
                  focus={null}
                  labels={FIELD_LABELS}
                  mergedLabel="Remaining"
                  description={`${STEPS[step].label}: ${usd(step === STEPS.length - 1 ? kept.amount : remaining)} of ${usd(paycheck.gross)} left.`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Num({ v, tone }: { v: number; tone?: 'accent' | 'critical' }) {
  const color = tone === 'accent' ? 'var(--accent)' : tone === 'critical' ? 'var(--status-critical)' : undefined
  return (
    <span className="tabular-nums" style={{ color }}>
      {usd(v)}
    </span>
  )
}

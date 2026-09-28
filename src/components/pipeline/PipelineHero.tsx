import { ArrowDown } from 'lucide-react'
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react'
import { Suspense, lazy, useMemo, useRef, useSyncExternalStore } from 'react'
import { percent, usd } from '../../lib/format'
import { pipelineFlow } from '../../lib/pipeline'
import type { TakeHomeBreakdown } from '../../lib/tax'
import { AnimatedNumber } from '../motion/AnimatedNumber'
import { EASE_OUT } from '../motion/easing'
import { FLOW_COLORS } from './pipelineTheme'

/* three.js is ~half the bundle; it loads after the calculator has painted. */
const PipelineScene = lazy(() => import('./PipelineScene'))

interface PipelineHeroProps {
  gross: number
  onGrossChange: (gross: number) => void
  takeHome: TakeHomeBreakdown
  monthlyCost: number
  surplus: number
  /** Surplus as a share of take-home, as the calculator defines it. */
  rate: number
  city: string
  /** Where "Fine-tune" scrolls to. */
  detailsId: string
}

const SALARY_MIN = 20_000
const SALARY_MAX = 500_000

let webglSupport: boolean | undefined
function canUseWebGL() {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement('canvas')
      webglSupport = !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
    } catch {
      webglSupport = false
    }
  }
  return webglSupport
}

const noSubscribe = () => () => {}
const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}
const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT } },
}

export function PipelineHero({
  gross,
  onGrossChange,
  takeHome,
  monthlyCost,
  surplus,
  rate,
  city,
  detailsId,
}: PipelineHeroProps) {
  const heroRef = useRef<HTMLElement>(null)
  const reduce = useReducedMotion() ?? false
  const inView = useInView(heroRef, { margin: '0px 0px -5% 0px' })
  /* Read on the client only. The server snapshot is "no WebGL", so markup
     matches between a Next.js server render and first client paint, and a
     device without WebGL keeps the static CSS backdrop. */
  const webgl = useSyncExternalStore(noSubscribe, canUseWebGL, () => false)
  const particles = useSyncExternalStore(noSubscribe, isDesktop, () => false) ? 2600 : 1400

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const sceneOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.1])
  const sceneY = useTransform(scrollYProgress, [0, 1], [0, 140])
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -48])

  const flow = useMemo(
    () => pipelineFlow(gross, takeHome.totalTax, monthlyCost * 12),
    [gross, takeHome.totalTax, monthlyCost],
  )
  /* More income → a thicker stream. Square root so low salaries still read. */
  const density =
    0.3 + 0.7 * Math.sqrt(Math.min(Math.max((gross - SALARY_MIN) / (SALARY_MAX - SALARY_MIN), 0), 1))

  const rows = [
    { key: 'gross', label: 'Gross income', amount: gross, share: 1, color: `linear-gradient(90deg, ${FLOW_COLORS.inflowA}, ${FLOW_COLORS.inflowB})` },
    { key: 'tax', label: 'Taxes', amount: takeHome.totalTax, share: flow.tax, color: FLOW_COLORS.tax },
    {
      key: 'cost',
      label: flow.deficit ? 'Living costs (capped)' : 'Living costs',
      amount: flow.cost * gross,
      share: flow.cost,
      color: flow.deficit ? FLOW_COLORS.deficit : FLOW_COLORS.cost,
    },
    { key: 'save', label: 'Saved', amount: flow.annualSavings, share: flow.save, color: FLOW_COLORS.save },
  ]

  return (
    <section
      ref={heroRef}
      aria-labelledby="pipeline-heading"
      className="relative isolate overflow-hidden border-b border-[var(--border)]"
    >
      {/* Scene layer. Stacked above the copy on small screens, full-bleed behind it on large ones. */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[340px] sm:h-[400px] lg:inset-0 lg:h-auto"
        style={reduce ? undefined : { opacity: sceneOpacity, y: sceneY }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.6, ease: 'easeOut' }}
      >
        {/* The static CSS glow stands in until three.js arrives, and stays on devices without WebGL. */}
        {webgl ? (
          <Suspense fallback={<div className="pipeline-backdrop absolute inset-0" />}>
            <PipelineScene
              flow={flow}
              density={density}
              active={inView}
              reducedMotion={reduce}
              scrollProgress={scrollYProgress}
              particleCount={particles}
            />
          </Suspense>
        ) : (
          <div className="pipeline-backdrop absolute inset-0" />
        )}
      </motion.div>

      {/* Legibility scrims: the copy column never sits on raw particles. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 hidden bg-[linear-gradient(90deg,var(--page)_0%,color-mix(in_srgb,var(--page)_88%,transparent)_30%,transparent_58%)] lg:block"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-[var(--page)] to-transparent"
      />

      <motion.div
        className="mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-[330px] sm:px-6 sm:pt-[380px] lg:min-h-[640px] lg:grid-cols-[minmax(0,440px)_1fr] lg:items-center lg:py-20"
        style={reduce ? undefined : { y: copyY }}
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <div>
          <motion.p variants={rise} className="text-xs font-semibold uppercase tracking-[0.085em] text-[var(--text-muted)]">
            Particle pipeline · 2026 tax year
          </motion.p>
          <motion.h2
            id="pipeline-heading"
            variants={rise}
            className="mt-4 text-balance text-[40px] font-extrabold leading-[1.02] tracking-[-0.04em] text-[var(--text-primary)] sm:text-[52px]"
          >
            See where every dollar of your salary goes.
          </motion.h2>
          <motion.p variants={rise} className="mt-4 max-w-md text-[15px] leading-7 text-[var(--text-secondary)]">
            Your pay enters as a stream. Taxes and living costs peel away; what
            is left condenses into savings. Drag the salary — the pipeline
            reruns federal, state and local tax for {city}.
          </motion.p>

          <motion.div
            variants={rise}
            className="mt-8 rounded-[22px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-raised)_90%,transparent)] p-5 shadow-[var(--shadow-raised)] backdrop-blur-md"
          >
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="hero-gross" className="text-xs font-medium text-[var(--text-secondary)]">
                Gross annual salary
              </label>
              <span className="text-lg font-semibold tabular-nums tracking-[-0.01em] text-[var(--text-primary)]">
                {usd(gross)}
              </span>
            </div>
            <input
              id="hero-gross"
              type="range"
              min={SALARY_MIN}
              max={SALARY_MAX}
              step={1_000}
              value={Math.min(Math.max(gross, SALARY_MIN), SALARY_MAX)}
              onChange={(e) => onGrossChange(Number(e.target.value))}
              aria-valuetext={`${usd(gross)} per year`}
              className="mt-3"
            />

            <dl className="mt-5 space-y-3 border-t border-[var(--gridline)] pt-4">
              {rows.map((row) => (
                <div key={row.key}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <dt className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <span aria-hidden className="size-2 rounded-full" style={{ background: row.color }} />
                      {row.label}
                    </dt>
                    <dd className="flex items-baseline gap-2.5 tabular-nums">
                      <AnimatedNumber value={row.amount} format={usd} className="font-medium text-[var(--text-primary)]" />
                      <span className="w-12 text-right text-xs text-[var(--text-muted)]">{percent(row.share)}</span>
                    </dd>
                  </div>
                  <div aria-hidden className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: row.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${row.share * 100}%` }}
                      transition={{ type: 'spring', stiffness: 110, damping: 22 }}
                    />
                  </div>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex items-end justify-between gap-4 border-t border-[var(--gridline)] pt-4">
              <div>
                <div className="text-xs text-[var(--text-muted)]">Monthly surplus</div>
                <AnimatedNumber
                  value={surplus}
                  format={usd}
                  className={`mt-0.5 block text-3xl font-semibold tabular-nums tracking-[-0.03em] ${
                    surplus < 0 ? 'text-[var(--status-critical)]' : 'text-[var(--text-primary)]'
                  }`}
                />
              </div>
              <div className="text-right">
                <div className="text-xs text-[var(--text-muted)]">Savings rate</div>
                <div className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                  {percent(rate)} <span className="font-normal text-[var(--text-muted)]">of take-home</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.button
            variants={rise}
            type="button"
            onClick={() =>
              document.getElementById(detailsId)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
            }
            className="group mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
          >
            Fine-tune metro, taxes and costs
            <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5" />
          </motion.button>
        </div>
      </motion.div>
    </section>
  )
}

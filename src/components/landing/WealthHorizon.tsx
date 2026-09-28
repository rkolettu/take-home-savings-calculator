import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { percent, usd, usdShort } from '../../lib/format'
import { metroOutcomes, wealthFor } from '../../lib/paycheck'
import { EASE } from './easing'
import { AnimatedNumber, MaskedWords, Reveal } from './motion'
import type { LandingModel } from './types'
import { useMedia } from './useMedia'

const PAD = { top: 20, right: 12, bottom: 34, left: 12 }

interface Series {
  key: string
  label: string
  city: string
  values: number[]
  stroke: string
  width: number
  dash?: string
}

/**
 * Where the monthly gap leads. The user's city against the metros that keep
 * the most and least on the same salary, projected with the calculator's
 * own simulation and assumptions, in today's dollars. A scrubber walks the
 * years so the divergence is felt, not just shown at the end.
 */
export function WealthHorizon({ model }: { model: LandingModel }) {
  /* Separate phone geometry so axis text stays legible rather than scaling down. */
  const desktop = useMedia('(min-width: 768px)')
  const W = desktop ? 1000 : 380
  const H = desktop ? 380 : 260
  const years = Math.max(1, model.horizonYears)
  const [year, setYear] = useState<number | null>(null)
  const at = year ?? years

  const series = useMemo<Series[]>(() => {
    const outcomes = metroOutcomes(model.gross, model.filingStatus, model.housingTier)
    const input = {
      gross: model.gross,
      filingStatus: model.filingStatus,
      tier: model.housingTier,
      wageGrowth: model.wageGrowth,
      inflationRate: model.inflationRate,
      annualReturn: model.annualReturn,
      startingBalance: model.startingBalance,
      years,
    }
    const real = (id: string, own = false) =>
      wealthFor(id, input, own ? model.costs : undefined).years.map((y) => y.realBalance)
    const best = outcomes[0].metro
    const worst = outcomes[outcomes.length - 1].metro
    const list: Series[] = [
      { key: 'best', label: 'Keeps the most', city: `${best.city}, ${best.stateCode}`, values: real(best.id), stroke: 'var(--ink)', width: 1.5 },
      { key: 'you', label: 'Your city', city: `${model.metro.city}, ${model.metro.stateCode}`, values: real(model.metro.id, true), stroke: 'var(--accent)', width: 3 },
      { key: 'worst', label: 'Keeps the least', city: `${worst.city}, ${worst.stateCode}`, values: real(worst.id), stroke: 'var(--muted)', width: 1.5, dash: '5 6' },
    ]
    return list
  }, [model, years])

  const maxV = Math.max(1, ...series.flatMap((s) => s.values))
  const x = (i: number) => PAD.left + (i / years) * (W - PAD.left - PAD.right)
  const y = (v: number) => H - PAD.bottom - (v / maxV) * (H - PAD.top - PAD.bottom)
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const you = series[1]
  const area = `${path(you.values)}L${x(years)},${H - PAD.bottom}L${x(0)},${H - PAD.bottom}Z`

  const best = series[0].values[at]
  const worst = series[2].values[at]
  const gap = best - worst

  return (
    <section
      data-chapter="03"
      data-chapter-name="Over time"
      aria-labelledby="wealth-heading"
      className="border-t border-[var(--line)] bg-[var(--panel)] py-24 sm:py-32"
    >
      <div className="landing-container">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
          03 · Over time
        </div>
        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end">
          <h2
            id="wealth-heading"
            className="text-[40px] font-bold leading-[0.98] tracking-[-0.05em] text-[var(--ink)] sm:text-[64px] lg:text-[76px]"
          >
            <MaskedWords text="A monthly gap becomes a different life." inView />
          </h2>
          <Reveal className="max-w-md text-base leading-7 text-[var(--ink-2)] lg:pb-3">
            Invest what each city leaves you, every month, for {years} years. Same simulation as the
            projection tab: {percent(model.wageGrowth)} raises, {percent(model.inflationRate)} inflation,{' '}
            {percent(model.annualReturn, 1)} blended return, shown in today's dollars.
          </Reveal>
        </div>

        <Reveal className="mt-16 grid gap-10 sm:grid-cols-3" delay={0.05}>
          {series.map((s) => (
            <div key={s.key} className="border-t pt-5" style={{ borderColor: s.key === 'you' ? 'var(--accent)' : 'var(--ink)' }}>
              <div className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">{s.label}</div>
              <div className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">{s.city}</div>
              <AnimatedNumber
                value={s.values[at]}
                format={usdShort}
                className={`mt-1 block text-[44px] font-bold leading-none tracking-[-0.055em] tabular-nums sm:text-[56px] ${
                  s.key === 'you' ? 'text-[var(--accent)]' : 'text-[var(--ink)]'
                }`}
              />
              <div className="mt-2 text-xs text-[var(--muted)]">by year {at}</div>
            </div>
          ))}
        </Reveal>

        <Reveal className="mt-14" delay={0.1}>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-label={`Projected balances over ${years} years`}>
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y(maxV * f)} y2={y(maxV * f)} stroke="var(--line)" strokeWidth={1} />
                <text x={PAD.left} y={y(maxV * f) - 6} textAnchor="start" className="fill-[var(--muted)] font-mono text-[11px]">
                  {usdShort(maxV * f)}
                </text>
              </g>
            ))}
            <motion.path
              d={area}
              fill="var(--accent)"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.07 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: EASE, delay: 0.6 }}
            />
            {series.map((s, i) => (
              <motion.path
                key={s.key + s.city}
                d={path(s.values)}
                fill="none"
                stroke={s.stroke}
                strokeWidth={s.width}
                strokeDasharray={s.dash}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 1.8, ease: EASE, delay: 0.15 * i }}
              />
            ))}
            <line x1={x(at)} x2={x(at)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--ink)" strokeWidth={1} strokeDasharray="2 4" />
            {series.map((s) => (
              <circle key={s.key} cx={x(at)} cy={y(s.values[at])} r={s.key === 'you' ? 6 : 4} fill={s.stroke} stroke="var(--panel)" strokeWidth={2} />
            ))}
            <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="var(--ink)" strokeWidth={1} />
            {Array.from({ length: years + 1 }, (_, i) => i)
              .filter((i) => i % Math.max(1, Math.round(years / (desktop ? 10 : 4))) === 0)
              .map((i) => (
                <text key={i} x={x(i)} y={H - 10} textAnchor="middle" className="fill-[var(--muted)] font-mono text-[11px]">
                  {i === 0 ? 'Now' : `Y${i}`}
                </text>
              ))}
          </svg>

          <div className="mt-6 flex flex-wrap items-center gap-6">
            <label htmlFor="wealth-year" className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              Scrub years
            </label>
            <input
              id="wealth-year"
              type="range"
              min={1}
              max={years}
              step={1}
              value={at}
              onChange={(e) => setYear(Number(e.target.value))}
              aria-valuetext={`Year ${at}`}
              className="salary-range min-w-[200px] flex-1"
              style={{ ['--fill' as string]: `${((at - 1) / Math.max(years - 1, 1)) * 100}%` }}
            />
            <span className="font-mono text-sm tabular-nums text-[var(--ink)]">Year {at}</span>
          </div>
        </Reveal>

        <Reveal className="mt-14 border-t border-[var(--line)] pt-8">
          <p className="max-w-3xl text-[26px] font-semibold leading-[1.25] tracking-[-0.03em] text-[var(--ink)] sm:text-[34px]">
            By year {at}, the same salary is worth{' '}
            <AnimatedNumber value={gap} format={usd} className="text-[var(--accent)] tabular-nums" /> more in{' '}
            {series[0].city.split(',')[0]} than in {series[2].city.split(',')[0]}.
          </p>
          <a href="#projection" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink)] underline decoration-[var(--line-strong)] underline-offset-4 hover:decoration-[var(--ink)]">
            Change these assumptions in the projection →
          </a>
        </Reveal>
      </div>
    </section>
  )
}

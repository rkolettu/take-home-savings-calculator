import { useMemo, useState } from 'react'
import { percent, usd } from '../../lib/format'
import type { Paycheck, PaycheckGroupKey } from '../../lib/paycheck'
import { dotCounts } from '../../lib/paycheck'
import type { FieldKey } from './PaycheckField'
import { PaycheckField } from './PaycheckField'
import { FIELD_LABELS, GROUP_TONES } from './landingTheme'
import { AnimatedNumber } from './motion'
import { useMedia } from './useMedia'

const ALL_DETACHED: Record<PaycheckGroupKey, boolean> = {
  tax: true,
  housing: true,
  living: true,
  kept: true,
}

/**
 * The hero sculpture with its reading aids: the gross figure and dot unit
 * above, a statistic per group below. Hovering either the dots or a
 * statistic isolates that group and lists what is inside it.
 */
export function Breakdown({ paycheck, entrance }: { paycheck: Paycheck; entrance?: boolean }) {
  const desktop = useMedia('(min-width: 768px)')
  const maxDots = desktop ? 1_400 : 700
  const counts = useMemo(() => dotCounts(paycheck, maxDots), [paycheck, maxDots])
  const [focus, setFocus] = useState<FieldKey | null>(null)

  const stats = [
    ...paycheck.groups.map((g) => ({ key: g.key as FieldKey, label: g.label, amount: g.amount, parts: g.parts })),
    ...(paycheck.shortfall > 0
      ? [{ key: 'shortfall' as FieldKey, label: 'Shortfall', amount: paycheck.shortfall, parts: [{ label: 'Costs beyond take-home', amount: paycheck.shortfall }] }]
      : []),
  ]
  const focused = stats.find((s) => s.key === focus)

  const description = `Monthly gross of ${usd(paycheck.gross)}: ${stats
    .map((s) => `${s.label} ${usd(s.amount)}`)
    .join(', ')}.`

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            One month, gross
          </div>
          <AnimatedNumber
            value={paycheck.gross}
            format={usd}
            className="mt-1 block text-[44px] font-semibold leading-none tracking-[-0.045em] text-[var(--ink)] tabular-nums sm:text-[56px]"
          />
        </div>
        <div className="pb-1 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
          <span className="mr-1.5 inline-block size-1.5 rounded-full bg-[var(--ink)] align-middle" />= {usd(counts.unit)}
        </div>
      </div>

      <div className="mt-6">
        <PaycheckField
          counts={counts}
          detached={ALL_DETACHED}
          maxDots={maxDots}
          rows={desktop ? 24 : 18}
          height={desktop ? 250 : 160}
          entrance={entrance}
          focus={focus}
          onFocus={setFocus}
          labels={FIELD_LABELS}
          mergedLabel="Gross"
          description={description}
        />
      </div>

      <dl
        className={`mt-6 grid gap-x-6 gap-y-5 border-t border-[var(--line)] pt-5 ${
          stats.length > 4 ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'
        }`}
      >
        {stats.map((s) => {
          const dim = focus !== null && focus !== s.key
          return (
            <div
              key={s.key}
              tabIndex={0}
              onPointerEnter={() => setFocus(s.key)}
              onPointerLeave={() => setFocus(null)}
              onFocus={() => setFocus(s.key)}
              onBlur={() => setFocus(null)}
              className="cursor-default rounded-sm transition-opacity duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
              style={{ opacity: dim ? 0.35 : 1 }}
            >
              <dt className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                <span
                  className={`inline-block size-2 rounded-full ${s.key === 'shortfall' ? 'border border-current bg-transparent' : ''}`}
                  style={s.key === 'shortfall' ? { color: GROUP_TONES.shortfall.swatch } : { background: GROUP_TONES[s.key].swatch }}
                />
                {s.label}
              </dt>
              <dd className="mt-1.5">
                <AnimatedNumber
                  value={s.amount}
                  format={usd}
                  className={`block text-2xl font-semibold tracking-[-0.03em] tabular-nums sm:text-[28px] ${
                    s.key === 'kept' ? 'text-[var(--accent)]' : s.key === 'shortfall' ? 'text-[var(--status-critical)]' : 'text-[var(--ink)]'
                  }`}
                />
                <span className="mt-0.5 block text-xs tabular-nums text-[var(--muted)]">
                  {s.key === 'shortfall' ? 'over take-home' : `${percent(paycheck.gross > 0 ? s.amount / paycheck.gross : 0)} of gross`}
                </span>
              </dd>
            </div>
          )
        })}
      </dl>

      <p className="mt-5 min-h-[20px] text-xs text-[var(--muted)]" aria-live="polite">
        {focused ? (
          <>
            <span className="font-medium text-[var(--ink-2)]">{focused.label}:</span>{' '}
            {focused.parts.map((p) => `${p.label} ${usd(p.amount)}`).join(' · ')}
          </>
        ) : (
          'Hover the dots or a figure to see what is inside it.'
        )}
      </p>
    </div>
  )
}

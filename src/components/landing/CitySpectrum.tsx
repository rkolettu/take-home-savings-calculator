import { ArrowDownRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { FILING_STATUS_LABELS, HOUSING_TIER_LABELS } from '../../data/types'
import { usd } from '../../lib/format'
import type { MetroOutcome } from '../../lib/paycheck'
import { metroOutcomes } from '../../lib/paycheck'
import { AnimatedNumber, MaskedWords, Reveal } from './motion'
import type { LandingModel } from './types'
import { useMedia } from './useMedia'

/**
 * Round axis bounds out to a tidy step so ticks land on whole hundreds.
 * Zero is only forced into view when some metro actually runs a deficit.
 */
function niceDomain(values: number[]): [number, number, number] {
  const min = Math.min(...values)
  const lo = min < 0 ? Math.min(min, 0) : min
  const hi = Math.max(...values, lo + 1)
  const span = hi - lo || 1
  const step = [100, 250, 500, 1_000, 2_000, 5_000, 10_000].find((s) => span / s <= 7) ?? 20_000
  return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step, step]
}

/**
 * The same salary in all 45 metros. Each metro is a dot on one axis of
 * monthly savings; dots that would overlap stack upward, so clusters read
 * as density. Picking a metro here picks it everywhere.
 */
export function CitySpectrum({ model }: { model: LandingModel }) {
  const desktop = useMedia('(min-width: 768px)')
  const outcomes = useMemo(
    () => metroOutcomes(model.gross, model.filingStatus, model.housingTier),
    [model.gross, model.filingStatus, model.housingTier],
  )
  const [hover, setHover] = useState<string | null>(null)

  const best = outcomes[0]
  const worst = outcomes[outcomes.length - 1]
  const rank = outcomes.findIndex((o) => o.metro.id === model.metro.id)
  const you = outcomes[rank]
  const [lo, hi, step] = niceDomain(outcomes.map((o) => o.kept))
  const ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step)

  /* Beeswarm: bin by position, stack within a bin. */
  const dot = desktop ? 12 : 9
  const bins = desktop ? 70 : 34
  const placed = useMemo(() => {
    const heights = new Map<number, number>()
    return [...outcomes]
      .sort((a, b) => (a.metro.id === model.metro.id ? 1 : b.metro.id === model.metro.id ? -1 : 0))
      .map((o) => {
        const t = (o.kept - lo) / (hi - lo)
        const bin = Math.round(t * bins)
        const level = heights.get(bin) ?? 0
        heights.set(bin, level + 1)
        return { o, t, level }
      })
  }, [outcomes, lo, hi, bins, model.metro.id])
  const maxLevel = Math.max(...placed.map((p) => p.level), 0)

  const hovered = placed.find((p) => p.o.metro.id === hover) ?? null
  const shown = [...outcomes.slice(0, 5), ...outcomes.slice(-5)]
  const spread = best.kept - worst.kept

  return (
    <section
      data-chapter="03"
      data-chapter-name="45 cities"
      aria-labelledby="spectrum-heading"
      className="border-t border-[var(--line)] py-24 sm:py-32"
    >
      <div className="landing-container">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
          03 · Same salary, 45 cities
        </div>
        <h2
          id="spectrum-heading"
          className="mt-5 max-w-4xl text-[40px] font-bold leading-[0.98] tracking-[-0.05em] text-[var(--ink)] sm:text-[64px] lg:text-[76px]"
        >
          <MaskedWords text="Same paycheck. Forty-five different outcomes." inView />
        </h2>
        <Reveal className="mt-6 max-w-xl text-base leading-7 text-[var(--ink-2)]">
          {usd(model.gross)} a year, filing {FILING_STATUS_LABELS[model.filingStatus].toLowerCase()}, with a{' '}
          {HOUSING_TIER_LABELS[model.housingTier].toLowerCase()} rent benchmark — run through each metro's
          own taxes and benchmark costs. Pick any city to carry it through the page.
        </Reveal>

        <Reveal className="mt-16 grid gap-10 border-t border-[var(--ink)] pt-8 sm:grid-cols-3" delay={0.05}>
          <Stat kicker="Keeps the most" city={`${best.metro.city}, ${best.metro.stateCode}`} value={best.kept} />
          <Stat
            kicker={`Your city · #${rank + 1} of ${outcomes.length}`}
            city={`${you.metro.city}, ${you.metro.stateCode}`}
            value={you.kept}
            accent
          />
          <Stat kicker="Keeps the least" city={`${worst.metro.city}, ${worst.metro.stateCode}`} value={worst.kept} />
        </Reveal>

        <Reveal className="mt-16" delay={0.1}>
          <div className="relative" style={{ height: (maxLevel + 1) * (dot + 3) + 64 }}>
            {hovered && (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-xs shadow-[var(--shadow-soft)]"
                style={{ left: `${hovered.t * 100}%`, bottom: 64 + (hovered.level + 1) * (dot + 3) + 8 }}
              >
                <span className="font-semibold text-[var(--ink)]">{hovered.o.metro.city}, {hovered.o.metro.stateCode}</span>{' '}
                <span className="tabular-nums text-[var(--ink-2)]">{usd(hovered.o.kept)}/mo</span>
              </div>
            )}
            {placed.map(({ o, t, level }) => {
              const isYou = o.metro.id === model.metro.id
              const edge = o === best || o === worst
              return (
                <button
                  key={o.metro.id}
                  type="button"
                  onClick={() => model.onMetroChange(o.metro.id)}
                  onPointerEnter={() => setHover(o.metro.id)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(o.metro.id)}
                  onBlur={() => setHover(null)}
                  aria-label={`${o.metro.city}, ${o.metro.stateCode}: ${usd(o.kept)} a month${isYou ? ' (selected)' : ''}`}
                  className="spectrum-dot absolute rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  style={{
                    width: dot,
                    height: dot,
                    left: `calc(${t * 100}% - ${dot / 2}px)`,
                    bottom: 40 + level * (dot + 3),
                    background: isYou ? 'var(--accent)' : o.kept < 0 ? 'transparent' : edge ? 'var(--ink)' : 'var(--ink-2)',
                    border: o.kept < 0 && !isYou ? '1.5px solid var(--status-critical)' : undefined,
                    opacity: hover && hover !== o.metro.id ? 0.35 : isYou || edge ? 1 : 0.55,
                    transform: isYou ? 'scale(1.35)' : undefined,
                    zIndex: isYou ? 2 : 1,
                  }}
                />
              )
            })}
            <div className="absolute inset-x-0 bottom-[34px] h-px bg-[var(--ink)]" />
            {ticks.map((v) => (
              <div
                key={v}
                className="absolute bottom-0 -translate-x-1/2 font-mono text-[10px] tabular-nums text-[var(--muted)]"
                style={{ left: `${((v - lo) / (hi - lo)) * 100}%` }}
              >
                <div className="mx-auto mb-2 h-1.5 w-px bg-[var(--ink)]" />
                {v === 0 ? '$0' : `${v < 0 ? '−' : ''}$${Math.abs(v) >= 1_000 ? `${Math.abs(v) / 1_000}k` : Math.abs(v)}`}
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
            <span>Keeps less</span>
            <span>Kept each month</span>
            <span>Keeps more</span>
          </div>
        </Reveal>

        <Reveal className="mt-16 grid gap-x-16 md:grid-cols-2" delay={0.1}>
          {[shown.slice(0, 5), shown.slice(5)].map((list, col) => (
            <div key={col}>
              <div className="flex justify-between border-b border-[var(--line)] pb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                <span>{col === 0 ? 'Keeps the most' : 'Keeps the least'}</span>
                <span>Per month</span>
              </div>
              <ol>
                {list.map((o) => (
                  <Row
                    key={o.metro.id}
                    o={o}
                    rank={outcomes.indexOf(o) + 1}
                    selected={o.metro.id === model.metro.id}
                    onPick={() => model.onMetroChange(o.metro.id)}
                  />
                ))}
              </ol>
            </div>
          ))}
        </Reveal>

        <Reveal className="mt-10 text-sm text-[var(--ink-2)]">
          The top and bottom of the list are{' '}
          <span className="font-semibold tabular-nums text-[var(--ink)]">{usd(spread)}</span> a month apart —{' '}
          <span className="font-semibold tabular-nums text-[var(--ink)]">{usd(spread * 12)}</span> a year, on the same salary.
        </Reveal>
      </div>
    </section>
  )
}

function Stat({ kicker, city, value, accent }: { kicker: string; city: string; value: number; accent?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">{kicker}</div>
      <div className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">{city}</div>
      <AnimatedNumber
        value={value}
        format={(v) => `${usd(v)}`}
        className={`mt-1 block text-[48px] font-bold leading-none tracking-[-0.055em] tabular-nums sm:text-[56px] lg:text-[68px] ${
          accent ? 'text-[var(--accent)]' : value < 0 ? 'text-[var(--status-critical)]' : 'text-[var(--ink)]'
        }`}
      />
      <div className="mt-2 text-xs text-[var(--muted)]">kept each month</div>
    </div>
  )
}

function Row({ o, rank, selected, onPick }: { o: MetroOutcome; rank: number; selected: boolean; onPick: () => void }) {
  return (
    <li className="border-b border-[var(--line)]">
      <button
        type="button"
        onClick={onPick}
        aria-pressed={selected}
        className="group flex w-full items-center gap-5 py-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <span className="w-6 font-mono text-[11px] tabular-nums text-[var(--muted)]">{String(rank).padStart(2, '0')}</span>
        <span
          className={`flex-1 text-xl font-semibold tracking-[-0.03em] transition-transform duration-500 group-hover:translate-x-1.5 sm:text-2xl ${
            selected ? 'text-[var(--accent)]' : 'text-[var(--ink)]'
          }`}
        >
          {o.metro.city}, {o.metro.stateCode}
        </span>
        <span className={`tabular-nums text-sm font-medium ${o.kept < 0 ? 'text-[var(--status-critical)]' : 'text-[var(--ink-2)]'}`}>
          {usd(o.kept)}
        </span>
        <ArrowDownRight className="size-4 text-[var(--muted)] transition-transform duration-500 group-hover:-rotate-45" />
      </button>
    </li>
  )
}

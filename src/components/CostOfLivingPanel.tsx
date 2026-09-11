import { Car, Home, RotateCcw, ShoppingCart, Ticket, Zap } from 'lucide-react'
import type { HousingTier, Metro } from '../data/metroData'
import {
  HOUSING_TIERS,
  HOUSING_TIER_HINTS,
  HOUSING_TIER_LABELS,
  housingForTier,
} from '../data/metroData'
import type { CostBreakdown, CostKey } from '../lib/costs'
import { COST_CATEGORIES, costsFromMetro, totalCost } from '../lib/costs'
import { number, parseCurrency, usd } from '../lib/format'
import { StackedBar } from './StackedBar'

const ICONS: Record<CostKey, typeof Home> = {
  housing: Home,
  utilities: Zap,
  groceries: ShoppingCart,
  transport: Car,
  discretionary: Ticket,
}

interface CostOfLivingPanelProps {
  costs: CostBreakdown
  metro: Metro
  housingTier: HousingTier
  isModified: boolean
  onCostChange: (key: CostKey, value: number) => void
  onHousingTierChange: (tier: HousingTier) => void
  onReset: () => void
}

/**
 * Every line item is editable two ways — type an exact figure, or drag the
 * slider. Both write to the same state, so the surplus updates on each
 * keystroke and each drag frame.
 */
export function CostOfLivingPanel({
  costs,
  metro,
  housingTier,
  isModified,
  onCostChange,
  onHousingTierChange,
  onReset,
}: CostOfLivingPanelProps) {
  const total = totalCost(costs)
  /* Benchmarks for the active tier — what "was $X" and Reset compare to. */
  const defaults = costsFromMetro(metro, housingTier)

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Housing arrangement
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">
            {HOUSING_TIER_HINTS[housingTier]}
          </span>
        </div>
        <div
          className="grid grid-cols-4 gap-1 rounded-xl border bg-[var(--surface-2)] p-1 shadow-[inset_0_1px_2px_rgba(23,23,23,0.03)]"
          style={{ borderColor: 'var(--border)' }}
        >
          {HOUSING_TIERS.map((tier) => {
            const active = tier === housingTier
            return (
              <button
                key={tier}
                type="button"
                aria-pressed={active}
                onClick={() => onHousingTierChange(tier)}
                title={`${HOUSING_TIER_HINTS[tier]} — ${usd(housingForTier(metro, tier))}/mo in ${metro.city}`}
                className="flex flex-col items-center rounded-lg px-1 py-2 transition-[transform,background-color,box-shadow,color] duration-150 hover:bg-[var(--surface-raised)] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
                style={{
                  background: active ? 'var(--surface-raised)' : 'transparent',
                  color: active
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                  boxShadow: active ? 'var(--shadow-soft)' : 'none',
                }}
              >
                <span className="truncate text-[11px] font-medium sm:text-xs">
                  {HOUSING_TIER_LABELS[tier]}
                </span>
                <span className="text-[10px] tabular-nums text-[var(--text-muted)]">
                  {usd(housingForTier(metro, tier))}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-4">
        {COST_CATEGORIES.map((category) => {
          const Icon = ICONS[category.key]
          const value = costs[category.key]
          const defaultValue = defaults[category.key]
          const changed = value !== defaultValue

          return (
            <div key={category.key}>
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor={`cost-${category.key}`}
                  className="flex min-w-0 items-center gap-2.5"
                >
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg shadow-[0_1px_2px_rgba(23,23,23,0.08)]"
                    style={{
                      background: category.seriesVar,
                      color: 'var(--surface-1)',
                    }}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[var(--text-primary)]">
                      {category.label}
                    </span>
                    <span className="block truncate text-xs text-[var(--text-muted)]">
                      {category.hint}
                    </span>
                  </span>
                </label>

                <div className="flex shrink-0 items-center gap-2">
                  {changed && (
                    <span className="hidden text-[11px] tabular-nums text-[var(--text-muted)] sm:inline">
                      was {usd(defaultValue)}
                    </span>
                  )}
                  <div
                    className="flex h-9 w-24 shrink-0 items-center rounded-lg border bg-[var(--surface-2)] px-2 transition-[border-color,box-shadow] duration-150 hover:border-[var(--baseline)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] focus-within:shadow-[var(--shadow-soft)] sm:w-28"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <span className="text-xs text-[var(--text-muted)]">$</span>
                    <input
                      id={`cost-${category.key}`}
                      inputMode="numeric"
                      value={number(value)}
                      onChange={(e) =>
                        onCostChange(category.key, parseCurrency(e.target.value))
                      }
                      className="w-full bg-transparent px-1 py-1.5 text-right text-sm font-medium tabular-nums text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={Math.max(
                  category.key === 'housing'
                    ? metro.housing2BRSolo * 2
                    : category.sliderMax,
                  value,
                )}
                step={category.step}
                value={value}
                onChange={(e) =>
                  onCostChange(category.key, Number(e.target.value))
                }
                aria-label={`${category.label} monthly cost`}
                className="mt-2.5 w-full"
              />
            </div>
          )
        })}
      </div>

      <div
        className="space-y-2.5 border-t pt-4"
        style={{ borderColor: 'var(--gridline)' }}
      >
        <StackedBar
          ariaLabel={`Monthly cost composition totalling ${usd(total)}`}
          segments={COST_CATEGORIES.map((c) => ({
            key: c.key,
            label: c.label,
            value: costs[c.key],
            color: c.seriesVar,
          }))}
        />
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)]">
            Total monthly cost
          </span>
          <span className="text-base font-semibold tabular-nums tracking-tight text-[var(--text-primary)]">
            {usd(total)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onReset}
        disabled={!isModified}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border bg-transparent px-3 text-sm font-medium transition-[transform,box-shadow,background-color,border-color] duration-150 hover:-translate-y-px hover:bg-[var(--surface-2)] hover:shadow-[var(--shadow-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:bg-transparent disabled:hover:shadow-none"
        style={{
          borderColor: 'var(--border)',
          color: 'var(--text-secondary)',
        }}
      >
        <RotateCcw className="size-4" />
        Reset to {metro.city} defaults
      </button>
    </div>
  )
}

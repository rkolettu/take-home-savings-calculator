import {
  Database,
  Home,
  ReceiptText,
  RefreshCw,
  ShoppingBasket,
  TrendingUp,
} from 'lucide-react'
import { USE_AUTOMATIC_COST_UPDATES } from '../data/costDataConfig'
import liveData from '../data/liveData.json'
import sourcedCosts from '../data/sourcedCosts.json'

const multipliers = [
  ...Object.values(sourcedCosts.categoryMultipliers),
  ...Object.values(sourcedCosts.housingMultipliers),
]
const hasActiveMultiplier = multipliers.some(
  (multiplier) => Math.abs(multiplier - 1) > 0.0001,
)
const sourcedDataActive = USE_AUTOMATIC_COST_UPDATES && hasActiveMultiplier

const items = [
  {
    label: 'Taxes',
    value: liveData.taxes,
    detail: 'Versioned tax tables',
    icon: ReceiptText,
  },
  {
    label: 'Rent',
    value: sourcedDataActive ? sourcedCosts.housingPeriod : liveData.rentEstimates,
    detail: sourcedDataActive ? 'Sourced-data index active' : liveData.rentSource,
    icon: Home,
  },
  {
    label: 'Living-cost data',
    value: sourcedDataActive ? liveData.costIndexPeriod : liveData.costModel,
    detail: sourcedDataActive ? 'EIA + USDA + BLS/FRED' : 'Modeled category benchmarks',
    icon: ShoppingBasket,
  },
  {
    label: 'Inflation',
    value: `${(liveData.inflationRate * 100).toFixed(1)}% CPI-U`,
    detail: liveData.inflationPeriod,
    icon: TrendingUp,
  },
]

export function DataFreshness() {
  return (
    <footer
      className="mt-2 border-t bg-[var(--surface-1)]"
      style={{ borderColor: 'var(--border)' }}
      aria-label="Data sources and disclaimer"
    >
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
              <Database className="size-4 text-[var(--accent)]" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                Data updated: {liveData.dataUpdated}
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                <RefreshCw className="size-3" />
                Weekly source checks · cached locally
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[720px] lg:grid-cols-4">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2 rounded-lg border bg-[var(--surface-2)] px-3 py-2"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <Icon className="size-3.5 shrink-0 text-[var(--text-muted)]" />
                  <div className="min-w-0 text-[10px] leading-4">
                    <div className="text-[var(--text-muted)]">{item.label}</div>
                    <div className="truncate font-semibold text-[var(--text-secondary)]">
                      {item.value}
                    </div>
                    <div className="truncate text-[9px] text-[var(--text-muted)]">
                      {item.detail}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div
          className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-[1fr_auto] md:items-end"
          style={{ borderColor: 'var(--gridline)' }}
        >
          <div className="space-y-1.5 text-[10px] leading-4 text-[var(--text-muted)]">
            <p>
              Current living-cost defaults are benchmark estimates, not live browser API results. One-bedroom rent anchors use August 2026 median asking-rent benchmarks where available; five uncovered metros use an explicitly labelled interpolation. Utilities, groceries, transportation, and discretionary spending remain modeled category benchmarks. A generated sourced-cost indexing layer is retained in the repository but is disabled until it can add validated movement beyond its base period without implying that it establishes the underlying price level.
            </p>
            <p>
              Tax rules are versioned separately and are not automatically inferred from new legislation. Wage-growth and investment-return inputs are planning assumptions and may be updated less frequently. The 2.5% default used for long-term projection inflation is a planning assumption and is separate from the current CPI reading shown above.
            </p>
            <p>
              Educational estimates only — not tax, investment, legal, or financial advice. Actual results may differ based on credits, deductions, benefits, withholding, residency, local rules, personal spending, and future tax-law changes. Verify important decisions with official sources or a qualified professional.
            </p>
          </div>

          <div className="whitespace-nowrap text-[10px] font-semibold text-[var(--text-secondary)] md:text-right">
            Built by Rishab Kolettu
          </div>
        </div>
      </div>
    </footer>
  )
}

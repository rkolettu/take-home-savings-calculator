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

// Ignore rounding noise from dividing raw source values by rounded anchors.
const hasHousingDrift = USE_AUTOMATIC_COST_UPDATES &&
  Object.values(sourcedCosts.housingMultipliers).some(
    (value) => Number.isFinite(value) && value >= 0.75 && value <= 1.25 && Math.abs(value - 1) > 0.00001,
  )

const items = [
  {
    label: 'Taxes',
    value: liveData.taxes,
    detail: 'Versioned tax tables',
    icon: ReceiptText,
  },
  {
    label: 'Rent',
    value: hasHousingDrift ? liveData.rentEstimates : 'Market benchmark estimates · Aug 2026',
    detail: hasHousingDrift ? liveData.rentSource : 'Median 1BR asking rents, single-source benchmark',
    icon: Home,
  },
  {
    label: 'Living-cost data',
    value: hasHousingDrift ? liveData.costModel : 'Benchmark estimates, inflation-indexed',
    detail: hasHousingDrift ? liveData.costIndexPeriod : 'Market benchmarks · Aug 2026',
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
              Living-cost defaults are cached, versioned benchmarks. {hasHousingDrift
                ? `${liveData.rentSource}. `
                : 'Housing uses August 2026 asking-rent benchmarks; five markets are interpolated. '}
              {hasHousingDrift
                ? `${liveData.costModel}. `
                : 'Automatic cost updates are disabled or have no validated drift; the benchmark basket is used. '}
              Other housing tiers are derived from the 1BR anchor. These are planning estimates, not live quotes.
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

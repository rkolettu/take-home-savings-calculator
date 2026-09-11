import {
  Database,
  Home,
  ReceiptText,
  RefreshCw,
  ShoppingBasket,
  TrendingUp,
} from 'lucide-react'
import { USE_AUTOMATIC_HOUSING_UPDATES } from '../data/costDataConfig'
import liveData from '../data/liveData.json'
import sourcedCosts from '../data/sourcedCosts.json'

// Ignore rounding noise from dividing raw source values by rounded anchors.
const hasHousingDrift = USE_AUTOMATIC_HOUSING_UPDATES &&
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
    value: hasHousingDrift ? liveData.rentEstimates : 'Aug 2026 asking-rent benchmarks',
    detail: hasHousingDrift ? liveData.rentSource : 'HUD FMR annual indexing enabled',
    icon: Home,
  },
  {
    label: 'Living-cost data',
    value: hasHousingDrift ? liveData.costModel : 'Versioned planning benchmarks',
    detail: hasHousingDrift
      ? liveData.costIndexPeriod
      : `HUD ${sourcedCosts.housingPeriod} anchor · auto-updates enabled`,
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
          <div className="group relative flex shrink-0 items-center gap-2.5" tabIndex={0}>
            <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
              <Database className="size-4 text-[var(--accent)]" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                Data snapshot: {liveData.dataUpdated}
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                <RefreshCw className="size-3" />
                Versioned sources · cached locally
              </div>
            </div>
            <div
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-max max-w-[280px] rounded-lg border bg-[var(--surface-raised)] px-3 py-2 text-[10px] leading-4 text-[var(--text-secondary)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100"
              style={{ borderColor: 'var(--border)' }}
            >
              Data snapshot: {liveData.dataUpdated}<br />
              Versioned sources · cached locally
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[720px] lg:grid-cols-4">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className="group relative flex items-center gap-2 rounded-lg border bg-[var(--surface-2)] px-3 py-2"
                  style={{ borderColor: 'var(--border)' }}
                  tabIndex={0}
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

                  <div
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[260px] -translate-x-1/2 rounded-lg border bg-[var(--surface-raised)] px-3 py-2 text-left text-[10px] leading-4 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="font-semibold text-[var(--text-primary)]">{item.label}</div>
                    <div className="text-[var(--text-secondary)]">{item.value}</div>
                    <div className="text-[var(--text-muted)]">{item.detail}</div>
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
              Living-cost defaults are cached, versioned planning benchmarks. {hasHousingDrift
                ? `${liveData.rentSource}. `
                : 'Housing uses August 2026 median 1BR asking-rent anchors; five markets are interpolated. '}
              {hasHousingDrift
                ? `${liveData.costModel}. HUD housing drift is applied automatically after a complete validated refresh. `
                : `HUD Fair Market Rent 1BR data is checked automatically and used as a bounded annual housing-drift index. ${sourcedCosts.housingPeriod} is the current anchor period, so no HUD rent adjustment is needed yet; a complete validated newer HUD fiscal year will be applied automatically. `}
              Other housing tiers are derived from the 1BR anchor. These are planning estimates, not live quotes.
            </p>
            <p>
              Tax tables use 2026 federal, state, and local rules and are maintained separately from living-cost data. The inflation figure above is the 12-month CPI-U reading for the period shown in this snapshot. The 2.5% default used for long-term projection inflation is a separate planning assumption; wage-growth and investment-return inputs are planning assumptions as well.
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

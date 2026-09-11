import {
  Database,
  Home,
  ReceiptText,
  RefreshCw,
  TrendingUp,
  Zap,
} from 'lucide-react'
import {
  USE_AUTOMATIC_HOUSING_UPDATES,
  USE_AUTOMATIC_UTILITY_UPDATES,
} from '../data/costDataConfig'
import liveData from '../data/liveData.json'
import sourcedCosts from '../data/sourcedCosts.json'

// Ignore rounding noise from dividing raw source values by rounded anchors.
const hasHousingDrift = USE_AUTOMATIC_HOUSING_UPDATES &&
  Object.values(sourcedCosts.housingMultipliers).some(
    (value) => Number.isFinite(value) && value >= 0.75 && value <= 1.25 && Math.abs(value - 1) > 0.00001,
  )

// Only claim an EIA anchor when the flag is on and the bills are actually there.
const electricity = (sourcedCosts as { electricity?: {
  billPeriod?: string
  stateAverageMonthlyBill?: Record<string, number>
} }).electricity
const hasSourcedUtilities = USE_AUTOMATIC_UTILITY_UPDATES &&
  Object.keys(electricity?.stateAverageMonthlyBill ?? {}).length > 0
const electricityPeriod = electricity?.billPeriod ?? 'latest annual'

/**
 * One tile per data domain, each naming its source and its vintage. The
 * wording is deliberately reader-facing: which public dataset a number comes
 * from and how old it is, rather than which internal switch produced it.
 */
const items = [
  {
    label: 'Taxes',
    value: liveData.taxes,
    detail: 'Federal, state and local',
    icon: ReceiptText,
  },
  {
    label: 'Rent',
    value: hasHousingDrift ? liveData.rentEstimates : 'Aug 2026 median asking rents',
    detail: hasHousingDrift
      ? liveData.rentSource
      : 'Re-indexed yearly to HUD fair-market rents',
    icon: Home,
  },
  {
    label: 'Utilities',
    value: hasSourcedUtilities ? 'EIA state electricity averages' : 'Per-metro estimates',
    detail: hasSourcedUtilities
      ? `${electricityPeriod} bills, scaled to one renter`
      : 'Modeled from the metro benchmark',
    icon: Zap,
  },
  {
    label: 'Inflation',
    value: `${(liveData.inflationRate * 100).toFixed(1)}% CPI-U`,
    detail: `12-month change, ${liveData.inflationPeriod}`,
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
                Data snapshot: {liveData.dataUpdated}
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                <RefreshCw className="size-3" />
                Public sources, refreshed automatically
              </div>
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

                  {/*
                    Purely a way to read text the tile had to truncate, so it
                    repeats the tile verbatim. Hidden from assistive tech and
                    from copied page text, which would otherwise see every
                    label, value and detail twice.
                  */}
                  <div
                    aria-hidden="true"
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
              <span className="font-semibold text-[var(--text-secondary)]">Housing.</span>{' '}
              {hasHousingDrift
                ? `${liveData.rentSource}. `
                : 'Rent starts from August 2026 median asking rents for a one-bedroom in each metro; five smaller markets are interpolated from nearby ones. '}
              Studio, roommate and two-bedroom figures are scaled from that one-bedroom anchor. Rent is re-indexed each year to HUD Fair Market Rents, so it tracks published federal rent data rather than drifting out of date.
            </p>
            <p>
              <span className="font-semibold text-[var(--text-secondary)]">Living costs.</span>{' '}
              {hasSourcedUtilities
                ? `Utilities start from the U.S. Energy Information Administration's average residential electricity bill for your metro's state (${electricityPeriod}), scaled down to a single renter; water, gas, trash and internet are estimated from the metro benchmark. `
                : 'Utilities are estimated from the metro benchmark. '}
              Groceries, transport and discretionary spending use per-metro planning benchmarks. Every line is editable — change any of them to match what you actually spend.
            </p>
            <p>
              <span className="font-semibold text-[var(--text-secondary)]">Taxes and inflation.</span>{' '}
              Tax tables use 2026 federal, state and local rules and are maintained separately from living-cost data. The CPI-U figure above is the most recent 12-month reading in this snapshot; it is not what projections use. Long-term projections default to 2.5% inflation, and wage growth and investment returns are planning assumptions you set yourself.
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

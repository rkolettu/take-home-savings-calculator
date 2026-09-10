import { Database, Home, ReceiptText, RefreshCw, TrendingUp } from 'lucide-react'
import liveData from '../data/liveData.json'

const items = [
  {
    label: 'Taxes',
    value: liveData.taxes,
    icon: ReceiptText,
  },
  {
    label: 'Rent estimates',
    value: liveData.rentEstimates,
    icon: Home,
  },
  {
    label: 'Inflation',
    value: liveData.inflationLabel,
    detail: `${(liveData.inflationRate * 100).toFixed(1)}% CPI-U · ${liveData.inflationPeriod}`,
    icon: TrendingUp,
  },
]

export function DataFreshness() {
  return (
    <section
      className="border-t bg-[var(--surface-1)]"
      style={{ borderColor: 'var(--border)' }}
      aria-label="Data freshness"
    >
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database className="size-4 text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Data updated: {liveData.dataUpdated}
            </span>
            <span className="hidden items-center gap-1 text-[10px] text-[var(--text-muted)] sm:flex">
              <RefreshCw className="size-3" />
              automatic checks enabled
            </span>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-start gap-1.5">
                  <Icon className="mt-0.5 size-3.5 shrink-0 text-[var(--text-muted)]" />
                  <div className="text-[11px] leading-4">
                    <span className="text-[var(--text-muted)]">{item.label}: </span>
                    <span className="font-semibold text-[var(--text-secondary)]">
                      {item.value}
                    </span>
                    {'detail' in item && item.detail ? (
                      <span className="ml-1 text-[var(--text-muted)]">
                        ({item.detail})
                      </span>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
          Inflation is checked automatically against the latest available U.S. CPI-U release. Tax tables and rent figures are versioned snapshots. Grocery, utility, transportation, discretionary-spending, wage-growth, and investment-return assumptions are benchmark estimates and may be refreshed less frequently than the headline data above.
        </p>
      </div>
    </section>
  )
}

import { TriangleAlert } from 'lucide-react'
import { usd } from '../lib/format'
import type { SimulationYear } from '../lib/simulation'

interface ProjectionSummaryProps {
  years: SimulationYear[]
  startingBalance: number
  inflationRate: number
  realMode: boolean
}

const CHECKPOINTS = [5, 10, 20, 30]

/** Net worth and cash flow at the standard checkpoints inside the horizon. */
export function ProjectionSummary({
  years,
  startingBalance,
  inflationRate,
  realMode,
}: ProjectionSummaryProps) {
  const horizon = years[years.length - 1].year
  const shown = CHECKPOINTS.filter((year) => year <= horizon)

  if (shown.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {shown.map((year) => {
        const row = years[year]
        const deflator = realMode ? (1 + inflationRate) ** year : 1
        const netWorth =
          (startingBalance + row.cumulativeContributions + row.growth) / deflator

        return (
          <div
            key={year}
            className="rounded-xl border bg-[var(--surface-1)] px-4 py-3.5"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="text-xs font-medium text-[var(--text-muted)]">
              Year {year}
            </div>
            <div className="mt-1.5 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
              {usd(netWorth)}
            </div>
            <dl className="mt-2 space-y-1 text-[11px]">
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--text-muted)]">Salary</dt>
                <dd className="tabular-nums text-[var(--text-secondary)]">
                  {usd(row.grossSalary)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--text-muted)]">Cash flow</dt>
                <dd
                  className="flex items-center gap-1 tabular-nums"
                  style={{
                    color:
                      row.annualSurplus < 0
                        ? 'var(--status-critical)'
                        : 'var(--text-secondary)',
                  }}
                >
                  {row.annualSurplus < 0 && (
                    <TriangleAlert className="size-3 shrink-0" />
                  )}
                  {usd(row.annualSurplus)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--text-muted)]">Metro</dt>
                <dd className="truncate text-[var(--text-secondary)]">
                  {row.metroLabel}
                </dd>
              </div>
            </dl>
          </div>
        )
      })}
    </div>
  )
}

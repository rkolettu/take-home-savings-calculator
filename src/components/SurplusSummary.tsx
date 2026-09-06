import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react'
import { percent, usd } from '../lib/format'

interface SurplusSummaryProps {
  netMonthly: number
  monthlyCost: number
  surplus: number
  rate: number
}

/**
 * The dashboard's hero figure plus the savings-rate meter.
 *
 * The meter's fill carries severity and its track is a wash of that same
 * colour, so the state reads across the whole bar. Every band ships an icon
 * and a written label — the status hue is reinforcement, never the signal.
 */
function bandFor(rate: number) {
  if (rate < 0) {
    return {
      color: 'var(--status-critical)',
      label: 'Running a deficit',
      hint: 'Baseline costs exceed take-home pay at this salary.',
      Icon: TriangleAlert,
    }
  }
  if (rate < 0.1) {
    return {
      color: 'var(--status-serious)',
      label: 'Very tight',
      hint: 'Under 10% of take-home is left after baseline costs.',
      Icon: CircleAlert,
    }
  }
  if (rate < 0.2) {
    return {
      color: 'var(--status-warning)',
      label: 'Tight',
      hint: 'Between 10% and 20% of take-home is left over.',
      Icon: CircleAlert,
    }
  }
  return {
    color: 'var(--status-good)',
    label: 'Healthy',
    hint: 'Over 20% of take-home is left after baseline costs.',
    Icon: CircleCheck,
  }
}

export function SurplusSummary({
  netMonthly,
  monthlyCost,
  surplus,
  rate,
}: SurplusSummaryProps) {
  const band = bandFor(rate)
  const fill = Math.min(Math.max(rate, 0), 1) * 100

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-medium text-[var(--text-muted)]">
          Monthly surplus
        </div>
        <div
          className="mt-1 text-5xl font-semibold tracking-tight"
          style={{ color: surplus < 0 ? 'var(--status-critical)' : undefined }}
        >
          {usd(surplus)}
        </div>
        <div className="mt-1.5 text-xs tabular-nums text-[var(--text-secondary)]">
          {usd(netMonthly)} take-home − {usd(monthlyCost)} costs
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Savings rate
          </span>
          <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
            {percent(rate)}
          </span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full"
          style={{
            background: `color-mix(in srgb, ${band.color} 18%, transparent)`,
          }}
          role="meter"
          aria-valuenow={Math.round(rate * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Savings rate as a share of take-home pay"
        >
          <div
            className="h-full rounded-full transition-[width] duration-200"
            style={{ width: `${fill}%`, background: band.color }}
          />
        </div>
        <div className="mt-2 flex items-start gap-1.5">
          <band.Icon
            className="mt-px size-4 shrink-0"
            style={{ color: band.color }}
          />
          <div className="min-w-0">
            <div className="text-sm font-medium text-[var(--text-primary)]">
              {band.label}
            </div>
            <div className="text-xs text-[var(--text-muted)]">{band.hint}</div>
          </div>
        </div>
      </div>

      <dl
        className="grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-4 text-sm"
        style={{ borderColor: 'var(--gridline)' }}
      >
        <dt className="text-[var(--text-secondary)]">Annual surplus</dt>
        <dd className="text-right font-medium tabular-nums text-[var(--text-primary)]">
          {usd(surplus * 12)}
        </dd>
        <dt className="text-[var(--text-secondary)]">Costs as % of pay</dt>
        <dd className="text-right font-medium tabular-nums text-[var(--text-primary)]">
          {netMonthly > 0 ? percent(monthlyCost / netMonthly) : '—'}
        </dd>
      </dl>
    </div>
  )
}

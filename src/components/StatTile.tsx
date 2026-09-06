import type { ReactNode } from 'react'

interface StatTileProps {
  label: string
  value: string
  detail?: string
  icon?: ReactNode
  /** Tints the value. Used sparingly — only the net-pay tile takes it. */
  emphasis?: boolean
}

/**
 * Stat tile: label · value · optional detail. No sparkline here — these are
 * point-in-time figures with no series behind them, so a trend line would be
 * decoration. Proportional figures, per the large-number rule.
 */
export function StatTile({
  label,
  value,
  detail,
  icon,
  emphasis = false,
}: StatTileProps) {
  return (
    <div
      className="rounded-xl border bg-[var(--surface-1)] px-4 py-3.5"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
        {icon}
        {label}
      </div>
      <div
        className="mt-1.5 text-2xl font-semibold tracking-tight"
        style={{ color: emphasis ? 'var(--accent)' : 'var(--text-primary)' }}
      >
        {value}
      </div>
      {detail && (
        <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
          {detail}
        </div>
      )}
    </div>
  )
}

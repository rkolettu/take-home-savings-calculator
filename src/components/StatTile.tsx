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
      className="rounded-xl border bg-[var(--surface-1)] px-4 py-4 shadow-[var(--shadow-soft)]"
      style={{
        borderColor: 'var(--border)',
        boxShadow:
          'var(--shadow-soft), inset 0 1px 0 color-mix(in srgb, var(--surface-raised) 72%, transparent)',
      }}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
        {icon && (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--text-secondary)]">
            {icon}
          </span>
        )}
        <span>{label}</span>
      </div>
      <div
        className="mt-2.5 text-[26px] font-semibold leading-none tracking-[-0.025em] tabular-nums"
        style={{ color: emphasis ? 'var(--accent)' : 'var(--text-primary)' }}
      >
        {value}
      </div>
      {detail && (
        <div className="mt-1.5 text-xs tabular-nums text-[var(--text-secondary)]">
          {detail}
        </div>
      )}
    </div>
  )
}

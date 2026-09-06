export interface StackedSegment {
  key: string
  label: string
  value: number
  color: string
}

interface StackedBarProps {
  segments: StackedSegment[]
  /** Screen-reader summary; the visible table beside the bar carries values. */
  ariaLabel: string
}

/**
 * Horizontal part-to-whole bar. Segments are separated by a 2px gap in the
 * surface colour rather than a stroke, and the outer ends are the only
 * rounded corners. Values are never printed on the segments — the row list
 * beneath is the label channel, which also discharges the light-mode
 * contrast relief rule for the lighter series slots.
 */
export function StackedBar({ segments, ariaLabel }: StackedBarProps) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0)
  const visible = segments.filter((s) => s.value > 0)

  if (total <= 0 || visible.length === 0) {
    return (
      <div
        className="h-3 w-full rounded-[4px]"
        style={{ background: 'var(--surface-2)' }}
        aria-label={ariaLabel}
      />
    )
  }

  return (
    <div
      className="flex h-3 w-full gap-[2px] overflow-hidden rounded-[4px]"
      role="img"
      aria-label={ariaLabel}
    >
      {visible.map((segment, index) => (
        <div
          key={segment.key}
          title={segment.label}
          style={{
            background: segment.color,
            flexBasis: `${(segment.value / total) * 100}%`,
            flexGrow: 0,
            flexShrink: 1,
            minWidth: '3px',
            borderTopLeftRadius: index === 0 ? 4 : 0,
            borderBottomLeftRadius: index === 0 ? 4 : 0,
            borderTopRightRadius: index === visible.length - 1 ? 4 : 0,
            borderBottomRightRadius: index === visible.length - 1 ? 4 : 0,
          }}
        />
      ))}
    </div>
  )
}

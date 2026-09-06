interface SliderFieldProps {
  id: string
  label: string
  hint?: string
  /** Value in display units (e.g. 3.5 for 3.5%), not the stored ratio. */
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  prefix?: string
  suffix?: string
  /** Decimal places shown in the number box. */
  decimals?: number
}

/** Labelled number box paired with a slider, both writing the same value. */
export function SliderField({
  id,
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
  prefix,
  suffix,
  decimals = 1,
}: SliderFieldProps) {
  function commit(raw: string) {
    const parsed = Number(raw.replace(/[^0-9.-]/g, ''))
    if (Number.isNaN(parsed)) return
    onChange(parsed)
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id} className="min-w-0">
          <span className="block text-xs font-medium text-[var(--text-secondary)]">
            {label}
          </span>
          {hint && (
            <span className="block text-[11px] text-[var(--text-muted)]">
              {hint}
            </span>
          )}
        </label>
        <div
          className="flex w-24 shrink-0 items-center rounded-lg border bg-[var(--surface-2)] px-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)]"
          style={{ borderColor: 'var(--border)' }}
        >
          {prefix && (
            <span className="text-xs text-[var(--text-muted)]">{prefix}</span>
          )}
          <input
            id={id}
            inputMode="decimal"
            value={value.toFixed(decimals)}
            onChange={(e) => commit(e.target.value)}
            className="w-full bg-transparent px-1 py-1.5 text-right text-sm font-medium tabular-nums text-[var(--text-primary)] focus:outline-none"
          />
          {suffix && (
            <span className="text-xs text-[var(--text-muted)]">{suffix}</span>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(Math.max(value, min), max)}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="mt-2 w-full"
      />
    </div>
  )
}

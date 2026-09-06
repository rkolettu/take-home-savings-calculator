import { Home, User, Users } from 'lucide-react'
import type { FilingStatus } from '../data/metroData'
import { number, parseCurrency } from '../lib/format'

interface IncomeInputProps {
  gross: number
  filingStatus: FilingStatus
  onGrossChange: (gross: number) => void
  onFilingStatusChange: (status: FilingStatus) => void
}

const SALARY_MIN = 20_000
const SALARY_MAX = 500_000

/* `short` is shown below the `sm` breakpoint, where the full label would
   truncate mid-word. The full label always rides along as the accessible
   name, so nothing is lost to a screen reader. */
const FILING_OPTIONS = [
  { value: 'single' as const, label: 'Single', short: 'Single', icon: User },
  {
    value: 'marriedJoint' as const,
    label: 'Married, joint',
    short: 'Joint',
    icon: Users,
  },
  {
    value: 'headOfHousehold' as const,
    label: 'Head of household',
    short: 'HoH',
    icon: Home,
  },
]

/** Gross salary entry (typed or dragged) plus the filing-status toggle. */
export function IncomeInput({
  gross,
  filingStatus,
  onGrossChange,
  onFilingStatusChange,
}: IncomeInputProps) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="gross-salary"
          className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
        >
          Gross annual salary
        </label>
        <div
          className="flex items-center rounded-lg border bg-[var(--surface-2)] px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)]"
          style={{ borderColor: 'var(--border)' }}
        >
          <span className="text-sm text-[var(--text-muted)]">$</span>
          <input
            id="gross-salary"
            inputMode="numeric"
            value={number(gross)}
            onChange={(e) => onGrossChange(parseCurrency(e.target.value))}
            className="w-full bg-transparent px-1.5 py-2.5 text-sm font-medium tabular-nums text-[var(--text-primary)] focus:outline-none"
          />
          <span className="text-xs text-[var(--text-muted)]">/ year</span>
        </div>
        <input
          type="range"
          min={SALARY_MIN}
          max={SALARY_MAX}
          step={1_000}
          value={Math.min(Math.max(gross, SALARY_MIN), SALARY_MAX)}
          onChange={(e) => onGrossChange(Number(e.target.value))}
          aria-label="Gross annual salary slider"
          className="mt-3 w-full"
        />
        <div className="flex justify-between text-[11px] tabular-nums text-[var(--text-muted)]">
          <span>$20k</span>
          <span>$500k</span>
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Filing status
        </span>
        <div
          className="grid grid-cols-3 gap-1 rounded-lg border bg-[var(--surface-2)] p-1"
          style={{ borderColor: 'var(--border)' }}
        >
          {FILING_OPTIONS.map((option) => {
            const active = option.value === filingStatus
            const Icon = option.icon
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                aria-label={option.label}
                onClick={() => onFilingStatusChange(option.value)}
                className="flex items-center justify-center gap-1 rounded-md px-1.5 py-2 text-[11px] font-medium transition-colors sm:gap-1.5 sm:px-2 sm:text-[13px]"
                style={{
                  background: active ? 'var(--surface-raised)' : 'transparent',
                  color: active
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate sm:hidden">{option.short}</span>
                <span className="hidden truncate sm:inline">{option.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

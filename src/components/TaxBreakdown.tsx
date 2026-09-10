import { ChevronRight, Info, Receipt } from 'lucide-react'
import { useState } from 'react'
import type { Metro } from '../data/metroData'
import { STATE_TAX } from '../data/metroData'
import { usd, percent } from '../lib/format'
import type { TakeHomeBreakdown } from '../lib/tax'
import { StackedBar } from './StackedBar'

interface TaxBreakdownProps {
  takeHome: TakeHomeBreakdown
  metro: Metro
}

/**
 * Expandable deduction detail. The stacked bar shows composition; the row
 * list beneath is the label channel and carries every value, so nothing is
 * communicated by colour alone.
 */
export function TaxBreakdown({ takeHome, metro }: TaxBreakdownProps) {
  const [open, setOpen] = useState(false)
  const spec = STATE_TAX[metro.stateCode]

  const rows = [
    {
      key: 'federal',
      label: 'Federal income tax',
      value: takeHome.federal,
      color: 'var(--tax-1)',
      note: `Marginal rate ${percent(takeHome.federalMarginalRate, 0)}`,
    },
    {
      key: 'socialSecurity',
      label: 'Social Security',
      value: takeHome.socialSecurity,
      color: 'var(--tax-2)',
      note: '6.2% up to the $184,500 wage base',
    },
    {
      key: 'medicare',
      label: 'Medicare',
      value: takeHome.medicare,
      color: 'var(--tax-3)',
      note: '1.45%, plus 0.9% above the surtax threshold',
    },
    {
      key: 'state',
      label: `State income tax — ${metro.stateCode}`,
      value: takeHome.state,
      color: 'var(--tax-4)',
      note:
        spec && spec.kind === 'none'
          ? 'No state tax on wage income'
          : spec && spec.kind === 'flat'
            ? `Flat ${percent(spec.rate, 2)}`
            : 'Progressive brackets',
    },
    {
      key: 'local',
      label: 'Local income tax',
      value: takeHome.local,
      color: 'var(--tax-5)',
      note: metro.localTaxNote ?? 'No local income tax in this metro',
    },
  ]

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
          <Receipt className="size-4 text-[var(--text-muted)]" />
          Where the deductions go
        </span>
        <span className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="tabular-nums">{usd(takeHome.totalTax)} / yr</span>
          <ChevronRight
            className="size-4 text-[var(--text-muted)] transition-transform"
            style={{ transform: open ? 'rotate(90deg)' : 'none' }}
          />
        </span>
      </button>

      <div className="mt-3">
        <StackedBar
          ariaLabel={`Annual deductions totalling ${usd(takeHome.totalTax)}`}
          segments={rows.map((r) => ({
            key: r.key,
            label: r.label,
            value: r.value,
            color: r.color,
          }))}
        />
      </div>

      {open && (
        <div className="mt-4 -mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[340px] text-sm">
            <thead>
              <tr className="text-xs text-[var(--text-muted)]">
                <th className="pb-2 text-left font-medium">Deduction</th>
                <th className="pb-2 text-right font-medium">Monthly</th>
                <th className="pb-2 text-right font-medium">Annual</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.key}
                  className="border-t"
                  style={{ borderColor: 'var(--gridline)' }}
                >
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-[3px]"
                        style={{ background: row.color }}
                      />
                      <span className="text-[var(--text-primary)]">
                        {row.label}
                      </span>
                    </span>
                    <span className="mt-0.5 block pl-4.5 text-xs text-[var(--text-muted)]">
                      {row.note}
                    </span>
                  </td>
                  <td className="py-2 text-right tabular-nums text-[var(--text-secondary)]">
                    {usd(row.value / 12)}
                  </td>
                  <td className="py-2 text-right font-medium tabular-nums text-[var(--text-primary)]">
                    {usd(row.value)}
                  </td>
                </tr>
              ))}
              <tr
                className="border-t"
                style={{ borderColor: 'var(--baseline)' }}
              >
                <td className="py-2 font-medium text-[var(--text-primary)]">
                  Total
                </td>
                <td className="py-2 text-right tabular-nums text-[var(--text-secondary)]">
                  {usd(takeHome.totalTax / 12)}
                </td>
                <td className="py-2 text-right font-semibold tabular-nums text-[var(--text-primary)]">
                  {usd(takeHome.totalTax)}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="mt-3 flex gap-1.5 text-xs text-[var(--text-muted)]">
            <Info className="mt-px size-3.5 shrink-0" />
            <span>
              Housing benchmark: {metro.housingConfidence === 'interpolated'
                ? 'Interpolated — prior benchmark scaled by 0.8829; not a measured asking rent.'
                : 'Sourced — Zumper median 1BR asking rent, August 2026.'}
            </span>
          </p>

          {spec?.confidence === 'carried-from-2025' && (
            <p className="mt-3 flex gap-1.5 text-xs text-[var(--text-muted)]">
              <Info className="mt-px size-3.5 shrink-0" />
              <span>
                {spec.name} figures are carried from {spec.vintage} — 2026
                brackets were not published at time of writing.
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

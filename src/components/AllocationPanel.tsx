import { usd } from '../lib/format'
import type { VehicleReturns, VehicleWeights } from '../lib/vehicles'
import {
  PRESETS,
  VEHICLES,
  blendedReturn,
  matchingPreset,
  normalisedWeights,
} from '../lib/vehicles'

interface AllocationPanelProps {
  weights: VehicleWeights
  returns: VehicleReturns
  startingBalance: number
  onWeightsChange: (weights: VehicleWeights) => void
  onReturnsChange: (returns: VehicleReturns) => void
  onStartingBalanceChange: (value: number) => void
}

const PRESET_LABELS: Record<string, string> = {
  cash: 'Cash',
  fixed: 'Fixed',
  index: 'Index',
  balanced: 'Balanced',
}

/**
 * Vehicle allocation. Weights are raw numbers normalised into shares, so
 * dragging one slider never silently rewrites the others — the displayed
 * percentages are derived, and the blend is always well defined.
 */
export function AllocationPanel({
  weights,
  returns,
  startingBalance,
  onWeightsChange,
  onReturnsChange,
  onStartingBalanceChange,
}: AllocationPanelProps) {
  const shares = normalisedWeights(weights)
  const active = matchingPreset(weights)
  const blended = blendedReturn(weights, returns)

  return (
    <div className="space-y-4">
      <div>
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Preset
        </span>
        <div className="grid grid-cols-4 gap-1">
          {Object.keys(PRESETS).map((name) => {
            const isActive = active === name
            return (
              <button
                key={name}
                type="button"
                aria-pressed={isActive}
                onClick={() => onWeightsChange({ ...PRESETS[name] })}
                className="rounded-md border px-2 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                  background: isActive
                    ? 'var(--accent-soft)'
                    : 'var(--surface-2)',
                  color: isActive
                    ? 'var(--accent)'
                    : 'var(--text-secondary)',
                }}
              >
                {PRESET_LABELS[name]}
              </button>
            )
          })}
        </div>
        {active === null && (
          <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
            Custom allocation
          </p>
        )}
      </div>

      <div className="space-y-3">
        {VEHICLES.map((vehicle) => (
          <div key={vehicle.id}>
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {vehicle.label}
                </div>
                <div className="truncate text-[11px] text-[var(--text-muted)]">
                  {vehicle.hint}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <div
                  className="flex w-16 items-center rounded-md border bg-[var(--surface-2)] px-1.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)]"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <input
                    inputMode="decimal"
                    aria-label={`${vehicle.label} expected return`}
                    value={(returns[vehicle.id] * 100).toFixed(1)}
                    onChange={(e) => {
                      const parsed = Number(e.target.value.replace(/[^0-9.]/g, ''))
                      if (Number.isNaN(parsed)) return
                      onReturnsChange({ ...returns, [vehicle.id]: parsed / 100 })
                    }}
                    className="w-full bg-transparent py-1 text-right text-xs font-medium tabular-nums text-[var(--text-primary)] focus:outline-none"
                  />
                  <span className="text-[11px] text-[var(--text-muted)]">%</span>
                </div>
                <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                  {(shares[vehicle.id] * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={weights[vehicle.id]}
              onChange={(e) =>
                onWeightsChange({
                  ...weights,
                  [vehicle.id]: Number(e.target.value),
                })
              }
              aria-label={`${vehicle.label} allocation`}
              className="mt-1.5 w-full"
            />
          </div>
        ))}
      </div>

      <div
        className="flex items-center justify-between border-t pt-3"
        style={{ borderColor: 'var(--gridline)' }}
      >
        <span className="text-sm text-[var(--text-secondary)]">
          Blended expected return
        </span>
        <span className="text-sm font-semibold tabular-nums text-[var(--accent)]">
          {(blended * 100).toFixed(2)}%
        </span>
      </div>

      <div>
        <label
          htmlFor="starting-balance"
          className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
        >
          Starting portfolio balance
        </label>
        <div
          className="flex items-center rounded-lg border bg-[var(--surface-2)] px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)]"
          style={{ borderColor: 'var(--border)' }}
        >
          <span className="text-sm text-[var(--text-muted)]">$</span>
          <input
            id="starting-balance"
            inputMode="numeric"
            value={usd(startingBalance).replace('$', '')}
            onChange={(e) =>
              onStartingBalanceChange(
                Number(e.target.value.replace(/[^0-9]/g, '')) || 0,
              )
            }
            className="w-full bg-transparent px-1.5 py-2 text-sm font-medium tabular-nums text-[var(--text-primary)] focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}

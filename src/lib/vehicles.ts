/** Investment vehicles and the blended-return math for a custom allocation. */

export type VehicleId = 'cash' | 'fixed' | 'index'

export interface Vehicle {
  id: VehicleId
  label: string
  hint: string
  /** Default nominal annual return. Editable in the UI. */
  defaultReturn: number
}

export const VEHICLES: Vehicle[] = [
  {
    id: 'cash',
    label: 'Cash / HYSA',
    hint: 'High-yield savings',
    defaultReturn: 0.04,
  },
  {
    id: 'fixed',
    label: 'CD ladder / fixed',
    hint: 'Term deposits, bonds',
    defaultReturn: 0.045,
  },
  {
    id: 'index',
    label: 'S&P 500 / broad index',
    hint: 'Long-run equity average',
    defaultReturn: 0.085,
  },
]

export type VehicleWeights = Record<VehicleId, number>
export type VehicleReturns = Record<VehicleId, number>

export const DEFAULT_RETURNS: VehicleReturns = {
  cash: 0.04,
  fixed: 0.045,
  index: 0.085,
}

/** Preset allocations. `custom` is whatever the user last dragged. */
export const PRESETS: Record<string, VehicleWeights> = {
  cash: { cash: 100, fixed: 0, index: 0 },
  fixed: { cash: 0, fixed: 100, index: 0 },
  index: { cash: 0, fixed: 0, index: 100 },
  balanced: { cash: 10, fixed: 30, index: 60 },
}

/**
 * Normalised share of each vehicle. Weights are held as raw numbers rather
 * than forced to sum to 100, so dragging one slider never silently rewrites
 * the others; the shares are derived instead.
 */
export function normalisedWeights(weights: VehicleWeights): VehicleWeights {
  const total = VEHICLES.reduce((sum, v) => sum + Math.max(0, weights[v.id]), 0)
  if (total <= 0) return { cash: 0, fixed: 0, index: 0 }
  return {
    cash: Math.max(0, weights.cash) / total,
    fixed: Math.max(0, weights.fixed) / total,
    index: Math.max(0, weights.index) / total,
  }
}

/**
 * Weighted nominal return for an allocation. Returns 0 when every weight is
 * zero, which keeps the projection flat rather than producing NaN.
 */
export function blendedReturn(
  weights: VehicleWeights,
  returns: VehicleReturns,
): number {
  const shares = normalisedWeights(weights)
  return VEHICLES.reduce((sum, v) => sum + shares[v.id] * returns[v.id], 0)
}

/** Which preset (if any) the current weights correspond to. */
export function matchingPreset(weights: VehicleWeights): string | null {
  const shares = normalisedWeights(weights)
  for (const [name, preset] of Object.entries(PRESETS)) {
    const presetShares = normalisedWeights(preset)
    const same = VEHICLES.every(
      (v) => Math.abs(shares[v.id] - presetShares[v.id]) < 0.0001,
    )
    if (same) return name
  }
  return null
}

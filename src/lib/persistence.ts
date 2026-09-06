import { METROS_BY_ID } from '../data/metroData'
import type { FilingStatus, HousingTier } from '../data/types'
import { HOUSING_TIERS } from '../data/types'
import type { CostBreakdown } from './costs'
import { COST_CATEGORIES } from './costs'
import type { Milestone, MilestoneKind } from './milestones'
import type { VehicleReturns, VehicleWeights } from './vehicles'
import { VEHICLES } from './vehicles'

/**
 * localStorage persistence.
 *
 * Everything read back is treated as untrusted: a user can edit the key by
 * hand, and a stale schema will outlive a deploy. Each field is validated
 * and silently dropped if it fails, so a corrupt entry degrades to defaults
 * rather than crashing the app on load.
 */

const STORAGE_KEY = 'take-home-calculator:v1'

export interface PersistedState {
  metroId: string
  gross: number
  filingStatus: FilingStatus
  costs: CostBreakdown
  housingTier: HousingTier
  wageGrowth: number
  inflationRate: number
  horizonYears: number
  startingBalance: number
  weights: VehicleWeights
  returns: VehicleReturns
  milestones: Milestone[]
  realMode: boolean
}

/** Private mode and disabled site data both make this throw, not return null. */
function defaultStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function num(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.min(Math.max(value, min), max)
}

const FILING_STATUSES: FilingStatus[] = [
  'single',
  'marriedJoint',
  'headOfHousehold',
]

const MILESTONE_KINDS: MilestoneKind[] = [
  'salary',
  'relocate',
  'housing',
  'housingTier',
  'expense',
]

function readCosts(value: unknown): CostBreakdown | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const source = value as Record<string, unknown>
  const costs = {} as CostBreakdown

  for (const category of COST_CATEGORIES) {
    /* `housing` was called `housing1BR` before multi-tier benchmarks; accept
       the old key so an existing saved budget survives the rename. */
    const raw =
      category.key === 'housing' && source.housing === undefined
        ? source.housing1BR
        : source[category.key]
    const parsed = num(raw, 0, 1_000_000)
    if (parsed === undefined) return undefined
    costs[category.key] = parsed
  }
  return costs
}

function readMilestone(value: unknown): Milestone | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const source = value as Record<string, unknown>

  const kind = source.kind
  if (typeof kind !== 'string') return undefined
  if (!MILESTONE_KINDS.includes(kind as MilestoneKind)) return undefined

  const year = num(source.year, 1, 30)
  const id = typeof source.id === 'string' ? source.id : undefined
  if (year === undefined || id === undefined) return undefined
  const base = { id, year: Math.round(year) }

  switch (kind as MilestoneKind) {
    case 'salary': {
      const grossSalary = num(source.grossSalary, 0, 100_000_000)
      return grossSalary === undefined
        ? undefined
        : { ...base, kind: 'salary', grossSalary }
    }
    case 'relocate': {
      const metroId = source.metroId
      if (typeof metroId !== 'string' || !METROS_BY_ID[metroId]) return undefined
      return { ...base, kind: 'relocate', metroId }
    }
    case 'housing': {
      const housing = num(source.housing, 0, 1_000_000)
      return housing === undefined
        ? undefined
        : { ...base, kind: 'housing', housing }
    }
    case 'housingTier': {
      const tier = source.tier
      if (typeof tier !== 'string') return undefined
      if (!HOUSING_TIERS.includes(tier as HousingTier)) return undefined
      return { ...base, kind: 'housingTier', tier: tier as HousingTier }
    }
    case 'expense': {
      const delta = num(source.delta, -1_000_000, 1_000_000)
      if (delta === undefined) return undefined
      const label = typeof source.label === 'string' ? source.label : ''
      return { ...base, kind: 'expense', delta, label: label.slice(0, 80) }
    }
  }
}

function readVehicleMap(
  value: unknown,
  min: number,
  max: number,
): Record<string, number> | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const source = value as Record<string, unknown>
  const result: Record<string, number> = {}

  for (const vehicle of VEHICLES) {
    const parsed = num(source[vehicle.id], min, max)
    if (parsed === undefined) return undefined
    result[vehicle.id] = parsed
  }
  return result
}

/** Reads and sanitises saved state. Never throws. */
export function loadState(
  storage: Storage | null = defaultStorage(),
): Partial<PersistedState> {
  if (!storage) return {}

  let parsed: unknown
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return {}
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }

  if (typeof parsed !== 'object' || parsed === null) return {}
  const source = parsed as Record<string, unknown>
  const state: Partial<PersistedState> = {}

  if (typeof source.metroId === 'string' && METROS_BY_ID[source.metroId]) {
    state.metroId = source.metroId
  }
  if (
    typeof source.filingStatus === 'string' &&
    FILING_STATUSES.includes(source.filingStatus as FilingStatus)
  ) {
    state.filingStatus = source.filingStatus as FilingStatus
  }
  if (typeof source.realMode === 'boolean') state.realMode = source.realMode

  if (
    typeof source.housingTier === 'string' &&
    HOUSING_TIERS.includes(source.housingTier as HousingTier)
  ) {
    state.housingTier = source.housingTier as HousingTier
  }

  const gross = num(source.gross, 0, 100_000_000)
  if (gross !== undefined) state.gross = gross

  const wageGrowth = num(source.wageGrowth, 0, 1)
  if (wageGrowth !== undefined) state.wageGrowth = wageGrowth

  const inflationRate = num(source.inflationRate, 0, 1)
  if (inflationRate !== undefined) state.inflationRate = inflationRate

  const horizonYears = num(source.horizonYears, 1, 30)
  if (horizonYears !== undefined) state.horizonYears = Math.round(horizonYears)

  const startingBalance = num(source.startingBalance, 0, 1_000_000_000)
  if (startingBalance !== undefined) state.startingBalance = startingBalance

  const costs = readCosts(source.costs)
  if (costs) state.costs = costs

  const weights = readVehicleMap(source.weights, 0, 100)
  if (weights) state.weights = weights as VehicleWeights

  const returns = readVehicleMap(source.returns, 0, 1)
  if (returns) state.returns = returns as VehicleReturns

  if (Array.isArray(source.milestones)) {
    /* One malformed entry drops itself rather than the whole timeline. */
    const milestones = source.milestones
      .map(readMilestone)
      .filter((m): m is Milestone => m !== undefined)
      .slice(0, 50)
    state.milestones = milestones
  }

  return state
}

/** Writes state. A full or unavailable store is a no-op, not an error. */
export function saveState(
  state: PersistedState,
  storage: Storage | null = defaultStorage(),
): void {
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* Quota exceeded or storage disabled — the app still works in memory. */
  }
}

export function clearState(storage: Storage | null = defaultStorage()): void {
  if (!storage) return
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    /* Nothing to do — the caller resets in-memory state regardless. */
  }
}

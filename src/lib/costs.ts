import { USE_AUTOMATIC_COST_UPDATES } from '../data/costDataConfig'
import sourcedCostsJson from '../data/sourcedCosts.json'
import type { HousingTier, Metro } from '../data/types'
import { housingForTier } from '../data/metros'

/**
 * The five editable cost-of-living line items.
 *
 * The housing line is `housing`, not `housing1BR`: it holds whichever
 * tier's benchmark is active (or the user's own figure). `Metro.housing1BR`
 * remains the name of the one-bedroom benchmark specifically.
 */
export type CostKey =
  | 'housing'
  | 'utilities'
  | 'groceries'
  | 'transport'
  | 'discretionary'

export type CostBreakdown = Record<CostKey, number>

export interface CostCategory {
  key: CostKey
  label: string
  hint: string
  /** Slider ceiling. Typing a larger number extends the track at runtime. */
  sliderMax: number
  step: number
  /** Which categorical series slot this line item owns. */
  seriesVar: string
}

interface SourcedCostData {
  dataVersion: string
  categoryMultipliers: Record<string, number>
  housingMultipliers: Record<string, number>
}

const sourcedCosts = sourcedCostsJson as SourcedCostData

/** Exposed so persistence can tell when a stored default predates a data refresh. */
export const COST_DATA_VERSION = USE_AUTOMATIC_COST_UPDATES
  ? sourcedCosts.dataVersion
  : 'legacy'

export const COST_CATEGORIES: CostCategory[] = [
  {
    key: 'housing',
    label: 'Housing',
    hint: 'Rent',
    sliderMax: 8_000,
    step: 25,
    seriesVar: 'var(--series-1)',
  },
  {
    key: 'utilities',
    label: 'Utilities',
    hint: 'Power, water, internet',
    sliderMax: 600,
    step: 5,
    seriesVar: 'var(--series-2)',
  },
  {
    key: 'groceries',
    label: 'Groceries',
    hint: 'Food at home',
    sliderMax: 1_500,
    step: 10,
    seriesVar: 'var(--series-3)',
  },
  {
    key: 'transport',
    label: 'Transport',
    hint: 'Transit pass or car costs',
    sliderMax: 1_200,
    step: 10,
    seriesVar: 'var(--series-4)',
  },
  {
    key: 'discretionary',
    label: 'Discretionary',
    hint: 'Dining, fun, subscriptions',
    sliderMax: 3_000,
    step: 25,
    seriesVar: 'var(--series-5)',
  },
]

function safeMultiplier(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1
  // A bad upstream file can never multiply a user's budget into nonsense.
  return value >= 0.5 && value <= 1.5 ? value : 1
}

function adjusted(value: number, multiplier: number): number {
  return Math.max(0, Math.round(value * multiplier))
}

/** Exact pre-upgrade benchmarks. This is also the one-switch rollback path. */
export function legacyCostsFromMetro(
  metro: Metro,
  tier: HousingTier = 'roommate',
): CostBreakdown {
  return {
    housing: housingForTier(metro, tier),
    utilities: metro.utilities,
    groceries: metro.groceries,
    transport: metro.transport,
    discretionary: metro.discretionary,
  }
}

/**
 * The metro's current baseline basket. The original metro values stay intact;
 * the generated source layer only applies bounded multipliers on top. If the
 * source layer is disabled, stale, missing, or malformed, this returns the
 * original benchmarks exactly.
 */
export function costsFromMetro(
  metro: Metro,
  tier: HousingTier = 'roommate',
): CostBreakdown {
  const legacy = legacyCostsFromMetro(metro, tier)
  if (!USE_AUTOMATIC_COST_UPDATES) return legacy

  return {
    housing: adjusted(
      legacy.housing,
      safeMultiplier(sourcedCosts.housingMultipliers[metro.id]),
    ),
    utilities: adjusted(
      legacy.utilities,
      safeMultiplier(sourcedCosts.categoryMultipliers.utilities),
    ),
    groceries: adjusted(
      legacy.groceries,
      safeMultiplier(sourcedCosts.categoryMultipliers.groceries),
    ),
    transport: adjusted(
      legacy.transport,
      safeMultiplier(sourcedCosts.categoryMultipliers.transport),
    ),
    discretionary: adjusted(
      legacy.discretionary,
      safeMultiplier(sourcedCosts.categoryMultipliers.discretionary),
    ),
  }
}

export function totalCost(costs: CostBreakdown): number {
  return COST_CATEGORIES.reduce((sum, c) => sum + costs[c.key], 0)
}

/** True when nothing has been hand-edited away from the current benchmark. */
export function costsMatchDefaults(
  costs: CostBreakdown,
  metro: Metro,
  tier: HousingTier = 'roommate',
): boolean {
  const defaults = costsFromMetro(metro, tier)
  return COST_CATEGORIES.every((c) => costs[c.key] === defaults[c.key])
}

/** Used only to migrate existing localStorage from the pre-source baseline. */
export function costsMatchLegacyDefaults(
  costs: CostBreakdown,
  metro: Metro,
  tier: HousingTier = 'roommate',
): boolean {
  const defaults = legacyCostsFromMetro(metro, tier)
  return COST_CATEGORIES.every((c) => costs[c.key] === defaults[c.key])
}

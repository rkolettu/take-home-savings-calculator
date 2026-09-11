import {
  USE_AUTOMATIC_HOUSING_UPDATES,
  USE_AUTOMATIC_NON_HOUSING_UPDATES,
} from '../data/costDataConfig'
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

interface ElectricitySourceData {
  stateAverageMonthlyBill?: Record<string, number>
  billPeriod?: string
  singleRenterFactor?: number
  modeledNonElectricShare?: number
  priceInflationMultiplier?: number
  pricePeriod?: string
}

interface SourcedCostData {
  dataVersion: string
  categoryMultipliers: Record<string, number>
  housingMultipliers: Record<string, number>
  housingAnchorYear?: number
  housingPeriod?: string
  electricity?: ElectricitySourceData
}

const sourcedCosts = sourcedCostsJson as SourcedCostData

/** Exposed so persistence can tell when a stored default predates a data refresh. */
const housingDataVersion = `hud-${sourcedCosts.housingAnchorYear ?? 'anchor'}-${sourcedCosts.housingPeriod ?? 'unknown'}`
export const COST_DATA_VERSION = USE_AUTOMATIC_HOUSING_UPDATES
  ? USE_AUTOMATIC_NON_HOUSING_UPDATES
    ? `${housingDataVersion}_${sourcedCosts.dataVersion}`
    : housingDataVersion
  : USE_AUTOMATIC_NON_HOUSING_UPDATES
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

function safeFraction(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return value >= min && value <= max ? value : fallback
}

function safeMonthlyBill(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value >= 30 && value <= 600 ? value : null
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
 * Utility basket with a real state-level electricity anchor.
 *
 * EIA publishes the average monthly residential electricity bill by state.
 * That reflects an average household rather than one renter, so the generated
 * data contains an explicit single-renter factor. Water, gas, trash and home
 * internet remain a modeled share of the metro's original utility benchmark.
 * Both pieces are bounded and the entire result falls back to the prior
 * inflation-indexed benchmark if the EIA source is missing or malformed.
 */
function sourcedUtilities(metro: Metro, legacyUtilities: number): number {
  const broadUtilityMultiplier = safeMultiplier(
    sourcedCosts.categoryMultipliers.utilities,
  )
  const fallback = adjusted(legacyUtilities, broadUtilityMultiplier)
  const electricity = sourcedCosts.electricity
  if (!electricity) return fallback

  const stateBill = safeMonthlyBill(
    electricity.stateAverageMonthlyBill?.[metro.stateCode],
  )
  if (stateBill === null) return fallback

  const renterFactor = safeFraction(
    electricity.singleRenterFactor,
    0.6,
    0.3,
    1,
  )
  const nonElectricShare = safeFraction(
    electricity.modeledNonElectricShare,
    0.45,
    0.2,
    0.8,
  )
  const electricityInflation = safeMultiplier(
    electricity.priceInflationMultiplier,
  )

  const electricityEstimate = stateBill * renterFactor * electricityInflation
  const modeledOtherUtilities =
    legacyUtilities * nonElectricShare * broadUtilityMultiplier
  const estimate = Math.round(electricityEstimate + modeledOtherUtilities)

  // Keep even a technically valid upstream value from producing a wild jump.
  const floor = Math.round(legacyUtilities * 0.5)
  const ceiling = Math.round(legacyUtilities * 2)
  return Math.min(Math.max(estimate, floor), ceiling)
}

/**
 * The metro's current baseline basket. Housing can follow validated HUD drift
 * independently from the other sourced cost categories. This keeps the August
 * 2026 asking-rent anchors intact today while allowing a later HUD fiscal year
 * to update rent automatically without also changing groceries or utilities.
 */
export function costsFromMetro(
  metro: Metro,
  tier: HousingTier = 'roommate',
): CostBreakdown {
  const legacy = legacyCostsFromMetro(metro, tier)
  const housing = USE_AUTOMATIC_HOUSING_UPDATES
    ? adjusted(
        legacy.housing,
        safeMultiplier(sourcedCosts.housingMultipliers[metro.id]),
      )
    : legacy.housing

  if (!USE_AUTOMATIC_NON_HOUSING_UPDATES) {
    return { ...legacy, housing }
  }

  return {
    housing,
    utilities: sourcedUtilities(metro, legacy.utilities),
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

import {
  USE_AUTOMATIC_HOUSING_UPDATES,
  USE_AUTOMATIC_NON_HOUSING_UPDATES,
  USE_AUTOMATIC_UTILITY_UPDATES,
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
  /** The `billPeriod` the escalator above was computed against. */
  priceInflationBasePeriod?: string
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

/**
 * Exposed so persistence can tell when a stored default predates a data
 * refresh. Each enabled source contributes its own segment, so turning one
 * layer on or off invalidates cached defaults without disturbing the others.
 */
const versionSegments = [
  USE_AUTOMATIC_HOUSING_UPDATES
    ? `hud-${sourcedCosts.housingAnchorYear ?? 'anchor'}-${sourcedCosts.housingPeriod ?? 'unknown'}`
    : null,
  USE_AUTOMATIC_UTILITY_UPDATES
    ? `eia-${sourcedCosts.electricity?.billPeriod ?? 'unknown'}`
    : null,
  USE_AUTOMATIC_NON_HOUSING_UPDATES ? sourcedCosts.dataVersion : null,
].filter((segment): segment is string => segment !== null)

export const COST_DATA_VERSION =
  versionSegments.length > 0 ? versionSegments.join('_') : 'legacy'

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
 * The electricity price escalator, but only when it still applies.
 *
 * `priceInflationMultiplier` carries the bills in `stateAverageMonthlyBill`
 * forward from their published year to the app's price period. It is therefore
 * valid for exactly one `billPeriod`. When a refresh pulls a newer EIA
 * workbook, the bills move forward but the escalator does not, and applying
 * the old one would inflate already-newer data a second time. Requiring the
 * recorded base period to match the current bill period makes that impossible:
 * a mismatch falls back to 1 and the fresher raw bills are used as published.
 */
export function electricityEscalator(electricity: ElectricitySourceData): number {
  const { priceInflationMultiplier, priceInflationBasePeriod, billPeriod } = electricity
  if (priceInflationMultiplier === undefined) return 1
  if (priceInflationBasePeriod === undefined || billPeriod === undefined) return 1
  if (priceInflationBasePeriod !== billPeriod) return 1
  return safeMultiplier(priceInflationMultiplier)
}

/**
 * Utility basket with a real state-level electricity anchor.
 *
 * EIA publishes the average monthly residential electricity bill by state.
 * That reflects an average household rather than one renter, so the generated
 * data contains an explicit single-renter factor. Water, gas, trash and home
 * internet remain a modeled share of the metro's original utility benchmark.
 * Both pieces are bounded and the entire result falls back to the prior
 * benchmark if the EIA source is missing or malformed.
 *
 * The broad `categoryMultipliers.utilities` value is applied only when the
 * unsourced category layer is enabled, so enabling EIA alone never smuggles in
 * an adjustment that no script can regenerate.
 */
function sourcedUtilities(metro: Metro, legacyUtilities: number): number {
  const broadUtilityMultiplier = USE_AUTOMATIC_NON_HOUSING_UPDATES
    ? safeMultiplier(sourcedCosts.categoryMultipliers.utilities)
    : 1
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

  const electricityEstimate =
    stateBill * renterFactor * electricityEscalator(electricity)
  const modeledOtherUtilities =
    legacyUtilities * nonElectricShare * broadUtilityMultiplier
  const estimate = Math.round(electricityEstimate + modeledOtherUtilities)

  // Keep even a technically valid upstream value from producing a wild jump.
  const floor = Math.round(legacyUtilities * 0.5)
  const ceiling = Math.round(legacyUtilities * 2)
  return Math.min(Math.max(estimate, floor), ceiling)
}

/**
 * The metro's current baseline basket.
 *
 * Each sourced layer is independent. Housing follows validated HUD drift,
 * utilities follow the EIA state electricity anchor, and the remaining
 * categories follow the static multipliers. A layer that is switched off
 * returns that line to its exact original metro benchmark, so any one source
 * can be enabled or rolled back without disturbing the others.
 */
export function costsFromMetro(
  metro: Metro,
  tier: HousingTier = 'roommate',
): CostBreakdown {
  const legacy = legacyCostsFromMetro(metro, tier)

  return {
    housing: USE_AUTOMATIC_HOUSING_UPDATES
      ? adjusted(
          legacy.housing,
          safeMultiplier(sourcedCosts.housingMultipliers[metro.id]),
        )
      : legacy.housing,
    utilities:
      USE_AUTOMATIC_UTILITY_UPDATES || USE_AUTOMATIC_NON_HOUSING_UPDATES
        ? sourcedUtilities(metro, legacy.utilities)
        : legacy.utilities,
    groceries: USE_AUTOMATIC_NON_HOUSING_UPDATES
      ? adjusted(
          legacy.groceries,
          safeMultiplier(sourcedCosts.categoryMultipliers.groceries),
        )
      : legacy.groceries,
    transport: USE_AUTOMATIC_NON_HOUSING_UPDATES
      ? adjusted(
          legacy.transport,
          safeMultiplier(sourcedCosts.categoryMultipliers.transport),
        )
      : legacy.transport,
    discretionary: USE_AUTOMATIC_NON_HOUSING_UPDATES
      ? adjusted(
          legacy.discretionary,
          safeMultiplier(sourcedCosts.categoryMultipliers.discretionary),
        )
      : legacy.discretionary,
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

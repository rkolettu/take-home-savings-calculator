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

/** The metro's baseline basket with housing taken from the chosen tier. */
export function costsFromMetro(
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

export function totalCost(costs: CostBreakdown): number {
  return COST_CATEGORIES.reduce((sum, c) => sum + costs[c.key], 0)
}

/** True when nothing has been hand-edited away from the tier's benchmark. */
export function costsMatchDefaults(
  costs: CostBreakdown,
  metro: Metro,
  tier: HousingTier = 'roommate',
): boolean {
  const defaults = costsFromMetro(metro, tier)
  return COST_CATEGORIES.every((c) => costs[c.key] === defaults[c.key])
}

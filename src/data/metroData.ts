/**
 * Public surface for the data layer.
 *
 * Components import from here; the underlying split between metro cost
 * baselines and tax tables is an implementation detail.
 */

export type {
  ByFilingStatus,
  Confidence,
  FilingStatus,
  HousingTier,
  Metro,
  Region,
  StateTaxSpec,
  TaxBracket,
} from './types'

export {
  FILING_STATUSES,
  FILING_STATUS_LABELS,
  HOUSING_TIERS,
  HOUSING_TIER_FIELDS,
  HOUSING_TIER_HINTS,
  HOUSING_TIER_LABELS,
  REGIONS,
} from './types'

export type { RegionGroup } from './metros'

export {
  METROS,
  METROS_BY_ID,
  MEAN_MONTHLY_COST,
  annualCostOfLiving,
  costIndex,
  groupByRegion,
  housingForTier,
  monthlyCostOfLiving,
} from './metros'

export {
  FEDERAL_BRACKETS,
  FEDERAL_STANDARD_DEDUCTION,
  FICA,
  STATE_TAX,
} from './taxTables'

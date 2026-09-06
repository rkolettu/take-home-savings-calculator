/**
 * Shared domain types for the cost-of-living / take-home model.
 *
 * Nothing in this file imports React. The whole data + math layer is
 * framework-agnostic so it can be unit tested in isolation.
 */

export type FilingStatus = 'single' | 'marriedJoint' | 'headOfHousehold'

export const FILING_STATUSES: readonly FilingStatus[] = [
  'single',
  'marriedJoint',
  'headOfHousehold',
]

export const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  single: 'Single',
  marriedJoint: 'Married, filing jointly',
  headOfHousehold: 'Head of household',
}

/** A per-filing-status set of dollar amounts. */
export type ByFilingStatus<T> = Record<FilingStatus, T>

/**
 * One marginal tax bracket.
 *
 * `upTo` is the INCLUSIVE upper bound of taxable income for this bracket,
 * expressed in whole dollars. The final bracket in any table uses `Infinity`.
 */
export interface TaxBracket {
  upTo: number
  rate: number
}

/**
 * How confident we are in a given table's figures.
 *
 * - `published-2026`: the official 2026 figure has been released.
 * - `carried-from-2025`: the 2026 figure is not published or not yet indexed,
 *   so the most recent known value is used as an estimate.
 */
export type Confidence = 'published-2026' | 'carried-from-2025'

interface TaxSpecMeta {
  /** Two-letter postal code. `DC` is included as a state-equivalent. */
  stateCode: string
  name: string
  /** The tax year the figures below actually describe. */
  vintage: number
  confidence: Confidence
  note?: string
}

export type StateTaxSpec = TaxSpecMeta &
  (
    | { kind: 'none' }
    | {
        kind: 'flat'
        rate: number
        standardDeduction: ByFilingStatus<number>
        /** Subtracted from income in addition to the standard deduction. */
        personalExemption: ByFilingStatus<number>
      }
    | {
        kind: 'progressive'
        brackets: ByFilingStatus<TaxBracket[]>
        standardDeduction: ByFilingStatus<number>
        personalExemption: ByFilingStatus<number>
      }
  )

/** Broad geographic grouping, used to organise the metro picker. */
export type Region =
  | 'Northeast'
  | 'Midwest'
  | 'Southeast'
  | 'Texas / Southwest'
  | 'Mountain'
  | 'West Coast'

/** Display order for region sections. Not alphabetical — roughly east to west. */
export const REGIONS: readonly Region[] = [
  'Northeast',
  'Midwest',
  'Southeast',
  'Texas / Southwest',
  'Mountain',
  'West Coast',
]

/** How the household is housed. Drives which rent benchmark applies. */
export type HousingTier = 'roommate' | 'studio' | 'one_bed' | 'two_bed_solo'

/** Selector order, roommate-first: cheapest arrangement to most expensive. */
export const HOUSING_TIERS: readonly HousingTier[] = [
  'roommate',
  'studio',
  'one_bed',
  'two_bed_solo',
]

export const HOUSING_TIER_LABELS: Record<HousingTier, string> = {
  roommate: 'Roommates',
  studio: 'Studio',
  one_bed: '1-Bed',
  two_bed_solo: '2-Bed Solo',
}

export const HOUSING_TIER_HINTS: Record<HousingTier, string> = {
  roommate: 'Your share of a 2–3 bedroom',
  studio: 'Studio apartment',
  one_bed: 'Standard one-bedroom',
  two_bed_solo: 'Two-bedroom, no roommates',
}

/** Which `Metro` field holds each tier's benchmark. */
export const HOUSING_TIER_FIELDS: Record<HousingTier, keyof Metro> = {
  roommate: 'housingRoommate',
  studio: 'housingStudio',
  one_bed: 'housing1BR',
  two_bed_solo: 'housing2BRSolo',
}

/** Monthly cost-of-living baseline for one metro, in whole USD. */
export interface Metro {
  id: string
  city: string
  stateCode: string
  region: Region
  /** Per-person share of a 2–3BR unit. */
  housingRoommate: number
  /** Studio apartment. */
  housingStudio: number
  /** Median asking rent for a 1-bedroom unit. The anchor for the other tiers. */
  housing1BR: number
  /** A full 2-bedroom occupied alone. */
  housing2BRSolo: number
  /** Electricity, gas, water, trash, home internet. */
  utilities: number
  groceries: number
  /** Transit pass, or car payment + insurance + fuel where transit is thin. */
  transport: number
  /** Dining out, entertainment, personal care, subscriptions. */
  discretionary: number
  /**
   * Resident local/municipal income tax as a share of gross wages, where one
   * exists (NYC, Philadelphia, Detroit, Portland). Omitted means none.
   */
  localIncomeTaxRate?: number
  localTaxNote?: string
}

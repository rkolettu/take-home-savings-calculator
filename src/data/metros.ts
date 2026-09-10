import type { HousingTier, Metro, Region } from './types'
import { HOUSING_TIER_FIELDS, REGIONS } from './types'

/**
 * Housing tiers are derived from the 1-bedroom anchor rather than typed out
 * four times per metro, so the 45 entries cannot drift out of proportion
 * with each other. A metro may still override any tier explicitly.
 *
 * The roommate share widens with market cost: where rent is high, people
 * share larger units and split further, so the per-person share falls to a
 * smaller fraction of a 1BR. All three ratios sit inside the intended
 * 55–60% band.
 */
function roommateRatio(oneBed: number): number {
  if (oneBed >= 2_400) return 0.55
  if (oneBed >= 1_600) return 0.575
  return 0.6
}

const STUDIO_RATIO = 0.85
const TWO_BED_SOLO_RATIO = 1.35

/** Rents are quoted in round numbers, so the derived tiers are too. */
function round10(value: number): number {
  return Math.round(value / 10) * 10
}

type MetroSeed = Omit<
  Metro,
  'housingRoommate' | 'housingStudio' | 'housing2BRSolo'
> &
  Partial<Pick<Metro, 'housingRoommate' | 'housingStudio' | 'housing2BRSolo'>>

function withHousingTiers(seed: MetroSeed): Metro {
  return {
    ...seed,
    housingRoommate:
      seed.housingRoommate ?? round10(seed.housing1BR * roommateRatio(seed.housing1BR)),
    housingStudio: seed.housingStudio ?? round10(seed.housing1BR * STUDIO_RATIO),
    housing2BRSolo:
      seed.housing2BRSolo ?? round10(seed.housing1BR * TWO_BED_SOLO_RATIO),
  }
}

/** The benchmark rent for one tier in one metro. */
export function housingForTier(metro: Metro, tier: HousingTier): number {
  return metro[HOUSING_TIER_FIELDS[tier]] as number
}

/**
 * Monthly cost-of-living baselines for 45 US metros, in whole USD.
 *
 * IMPORTANT — these are BENCHMARK ESTIMATES, not a licensed dataset.
 * They are assembled to be directionally right and internally consistent
 * so that metro-to-metro comparison is meaningful; no individual figure
 * should be quoted as an authoritative statistic. Replacing this array
 * with real data requires no changes anywhere else in the codebase.
 *
 * Category definitions:
 *  - housing1BR      median asking rent, one-bedroom, metro-wide blend
 *  - utilities       electricity, gas, water, trash, home internet
 *  - groceries       single-person food-at-home basket
 *  - transport       transit pass where transit is viable, otherwise car
 *                    payment + insurance + fuel
 *  - discretionary   dining out, entertainment, personal care, subscriptions
 *
 * `localIncomeTaxRate` is a resident municipal or county wage tax, applied
 * as a flat share of gross. Where the real schedule is graduated or has a
 * threshold, the note says which direction the approximation errs.
 *
 * Vintage: 2026 estimates. Entries are grouped by region for readability;
 * display order is derived, not positional.
 */
const METRO_SEEDS: MetroSeed[] = [
  /* ---------------------------- Northeast ---------------------------- */
  {
    id: 'new-york-ny',
    city: 'New York',
    stateCode: 'NY',
    region: 'Northeast',
    housing1BR: 4500,
    utilities: 180,
    groceries: 620,
    transport: 145,
    discretionary: 900,
    localIncomeTaxRate: 0.0376,
    localTaxNote:
      'NYC resident income tax, modelled as a flat 3.76% of gross. The real schedule is mildly progressive (roughly 3.078%–3.876%).',
  },
  {
    id: 'boston-ma',
    city: 'Boston',
    stateCode: 'MA',
    region: 'Northeast',
    housing1BR: 2960,
    utilities: 200,
    groceries: 570,
    transport: 100,
    discretionary: 780,
  },
  {
    id: 'stamford-ct',
    city: 'Stamford / Greenwich',
    stateCode: 'CT',
    region: 'Northeast',
    housing1BR: 2300,
    utilities: 195,
    groceries: 560,
    transport: 170,
    discretionary: 720,
  },
  {
    id: 'washington-dc',
    city: 'Washington',
    stateCode: 'DC',
    region: 'Northeast',
    housing1BR: 2220,
    utilities: 175,
    groceries: 545,
    transport: 130,
    discretionary: 750,
  },
  {
    id: 'philadelphia-pa',
    city: 'Philadelphia',
    stateCode: 'PA',
    region: 'Northeast',
    housing1BR: 1450,
    utilities: 165,
    groceries: 490,
    transport: 120,
    discretionary: 590,
    localIncomeTaxRate: 0.0375,
    localTaxNote:
      'Philadelphia resident wage tax, applied to gross wages with no deductions.',
  },
  {
    id: 'hartford-ct',
    city: 'Hartford',
    stateCode: 'CT',
    region: 'Northeast',
    housing1BR: 1410,
    utilities: 190,
    groceries: 510,
    transport: 150,
    discretionary: 570,
  },
  {
    id: 'baltimore-md',
    city: 'Baltimore',
    stateCode: 'MD',
    region: 'Northeast',
    housing1BR: 1220,
    utilities: 170,
    groceries: 490,
    transport: 120,
    discretionary: 560,
    localIncomeTaxRate: 0.032,
    localTaxNote:
      'Baltimore City local income tax. In Maryland this is collected on the state return rather than separately, but it is a genuine local add-on.',
  },
  {
    id: 'wilmington-de',
    city: 'Wilmington',
    stateCode: 'DE',
    region: 'Northeast',
    housing1BR: 1240,
    utilities: 170,
    groceries: 480,
    transport: 150,
    discretionary: 540,
    localIncomeTaxRate: 0.0125,
    localTaxNote: 'Wilmington resident city wage tax.',
  },
  {
    id: 'pittsburgh-pa',
    city: 'Pittsburgh',
    stateCode: 'PA',
    region: 'Northeast',
    housing1BR: 1350,
    utilities: 165,
    groceries: 470,
    transport: 120,
    discretionary: 540,
    localIncomeTaxRate: 0.03,
    localTaxNote:
      'Combined Pittsburgh resident earned income tax (1%) and school district tax (2%).',
  },

  /* ----------------------------- Midwest ----------------------------- */
  {
    id: 'chicago-il',
    city: 'Chicago',
    stateCode: 'IL',
    region: 'Midwest',
    housing1BR: 2190,
    utilities: 155,
    groceries: 500,
    transport: 120,
    discretionary: 640,
  },
  {
    id: 'minneapolis-mn',
    city: 'Minneapolis',
    stateCode: 'MN',
    region: 'Midwest',
    housing1BR: 1280,
    utilities: 150,
    groceries: 480,
    transport: 130,
    discretionary: 570,
  },
  {
    id: 'columbus-oh',
    city: 'Columbus',
    stateCode: 'OH',
    region: 'Midwest',
    housing1BR: 1190,
    utilities: 155,
    groceries: 460,
    transport: 165,
    discretionary: 540,
    localIncomeTaxRate: 0.025,
    localTaxNote:
      'Columbus city income tax. Ohio cities credit tax paid to a different work city; this model assumes you live and work in the same city.',
  },
  {
    id: 'milwaukee-wi',
    city: 'Milwaukee',
    stateCode: 'WI',
    region: 'Midwest',
    housing1BR: 1100,
    utilities: 160,
    groceries: 470,
    transport: 140,
    discretionary: 530,
  },
  {
    id: 'kansas-city-mo',
    city: 'Kansas City',
    stateCode: 'MO',
    region: 'Midwest',
    housing1BR: 1160,
    utilities: 165,
    groceries: 455,
    transport: 170,
    discretionary: 530,
    localIncomeTaxRate: 0.01,
    localTaxNote:
      'Kansas City earnings tax. Modelled on the Missouri side of the metro; the Kansas side has no earnings tax but a different state tax.',
  },
  {
    id: 'indianapolis-in',
    city: 'Indianapolis',
    stateCode: 'IN',
    region: 'Midwest',
    housing1BR: 1040,
    utilities: 160,
    groceries: 455,
    transport: 170,
    discretionary: 520,
    localIncomeTaxRate: 0.0202,
    localTaxNote:
      'Marion County local income tax. Indiana county tax is filed with the state return but is a genuine local rate.',
  },
  {
    id: 'cincinnati-oh',
    city: 'Cincinnati',
    stateCode: 'OH',
    region: 'Midwest',
    housing1BR: 1080,
    utilities: 160,
    groceries: 455,
    transport: 165,
    discretionary: 520,
    localIncomeTaxRate: 0.018,
    localTaxNote: 'Cincinnati city income tax.',
  },
  {
    id: 'st-louis-mo',
    city: 'St. Louis',
    stateCode: 'MO',
    region: 'Midwest',
    housing1BR: 1010,
    utilities: 165,
    groceries: 455,
    transport: 165,
    discretionary: 520,
    localIncomeTaxRate: 0.01,
    localTaxNote: 'St. Louis city earnings tax on residents.',
  },
  {
    id: 'detroit-mi',
    city: 'Detroit',
    stateCode: 'MI',
    region: 'Midwest',
    housing1BR: 940,
    utilities: 165,
    groceries: 460,
    transport: 170,
    discretionary: 520,
    localIncomeTaxRate: 0.024,
    localTaxNote: 'Detroit resident income tax.',
  },
  {
    id: 'cleveland-oh',
    city: 'Cleveland',
    stateCode: 'OH',
    region: 'Midwest',
    housing1BR: 1200,
    utilities: 165,
    groceries: 455,
    transport: 160,
    discretionary: 510,
    localIncomeTaxRate: 0.025,
    localTaxNote: 'Cleveland city income tax.',
  },

  /* ---------------------------- Southeast ---------------------------- */
  {
    id: 'miami-fl',
    city: 'Miami',
    stateCode: 'FL',
    region: 'Southeast',
    housing1BR: 2550,
    utilities: 170,
    groceries: 540,
    transport: 180,
    discretionary: 700,
  },
  {
    id: 'palm-beach-fl',
    city: 'Palm Beach',
    stateCode: 'FL',
    region: 'Southeast',
    housing1BR: 2120,
    utilities: 180,
    groceries: 530,
    transport: 185,
    discretionary: 700,
  },
  {
    id: 'naples-fl',
    city: 'Naples',
    stateCode: 'FL',
    region: 'Southeast',
    housing1BR: 2030,
    utilities: 180,
    groceries: 540,
    transport: 185,
    discretionary: 720,
  },
  {
    id: 'tampa-fl',
    city: 'Tampa',
    stateCode: 'FL',
    region: 'Southeast',
    housing1BR: 1500,
    utilities: 175,
    groceries: 490,
    transport: 180,
    discretionary: 590,
  },
  {
    id: 'atlanta-ga',
    city: 'Atlanta',
    stateCode: 'GA',
    region: 'Southeast',
    housing1BR: 1660,
    utilities: 160,
    groceries: 480,
    transport: 180,
    discretionary: 600,
  },
  {
    id: 'orlando-fl',
    city: 'Orlando',
    stateCode: 'FL',
    region: 'Southeast',
    housing1BR: 1450,
    utilities: 175,
    groceries: 485,
    transport: 180,
    discretionary: 590,
  },
  {
    id: 'nashville-tn',
    city: 'Nashville',
    stateCode: 'TN',
    region: 'Southeast',
    housing1BR: 1520,
    utilities: 155,
    groceries: 470,
    transport: 180,
    discretionary: 590,
  },
  {
    id: 'charlotte-nc',
    city: 'Charlotte',
    stateCode: 'NC',
    region: 'Southeast',
    housing1BR: 1430,
    utilities: 155,
    groceries: 460,
    transport: 175,
    discretionary: 550,
  },
  {
    id: 'raleigh-durham-nc',
    city: 'Raleigh-Durham',
    stateCode: 'NC',
    region: 'Southeast',
    housing1BR: 1295,
    utilities: 155,
    groceries: 465,
    transport: 175,
    discretionary: 550,
  },
  {
    id: 'jacksonville-fl',
    city: 'Jacksonville',
    stateCode: 'FL',
    region: 'Southeast',
    housing1BR: 1110,
    utilities: 175,
    groceries: 470,
    transport: 180,
    discretionary: 550,
  },
  {
    id: 'new-orleans-la',
    city: 'New Orleans',
    stateCode: 'LA',
    region: 'Southeast',
    housing1BR: 1430,
    utilities: 175,
    groceries: 480,
    transport: 165,
    discretionary: 570,
  },
  {
    id: 'richmond-va',
    city: 'Richmond',
    stateCode: 'VA',
    region: 'Southeast',
    housing1BR: 1410,
    utilities: 165,
    groceries: 470,
    transport: 165,
    discretionary: 540,
  },

  /* ------------------------ Texas / Southwest ------------------------ */
  {
    id: 'austin-tx',
    city: 'Austin',
    stateCode: 'TX',
    region: 'Texas / Southwest',
    housing1BR: 1260,
    utilities: 165,
    groceries: 480,
    transport: 185,
    discretionary: 600,
  },
  {
    id: 'dallas-tx',
    city: 'Dallas',
    stateCode: 'TX',
    region: 'Texas / Southwest',
    housing1BR: 1270,
    utilities: 175,
    groceries: 470,
    transport: 185,
    discretionary: 570,
  },
  {
    id: 'phoenix-az',
    city: 'Phoenix',
    stateCode: 'AZ',
    region: 'Texas / Southwest',
    housing1BR: 1190,
    utilities: 185,
    groceries: 470,
    transport: 185,
    discretionary: 560,
  },
  {
    id: 'las-vegas-nv',
    city: 'Las Vegas',
    stateCode: 'NV',
    region: 'Texas / Southwest',
    housing1BR: 1150,
    utilities: 175,
    groceries: 465,
    transport: 180,
    discretionary: 570,
  },
  {
    id: 'houston-tx',
    city: 'Houston',
    stateCode: 'TX',
    region: 'Texas / Southwest',
    housing1BR: 1050,
    utilities: 180,
    groceries: 460,
    transport: 190,
    discretionary: 550,
  },
  {
    id: 'san-antonio-tx',
    city: 'San Antonio',
    stateCode: 'TX',
    region: 'Texas / Southwest',
    housing1BR: 960,
    utilities: 175,
    groceries: 450,
    transport: 180,
    discretionary: 520,
  },

  /* ---------------------------- Mountain ----------------------------- */
  {
    id: 'denver-co',
    city: 'Denver',
    stateCode: 'CO',
    region: 'Mountain',
    housing1BR: 1540,
    utilities: 150,
    groceries: 500,
    transport: 165,
    discretionary: 620,
  },
  {
    id: 'salt-lake-city-ut',
    city: 'Salt Lake City',
    stateCode: 'UT',
    region: 'Mountain',
    housing1BR: 1200,
    utilities: 140,
    groceries: 470,
    transport: 155,
    discretionary: 550,
  },

  /* --------------------------- West Coast ---------------------------- */
  {
    id: 'san-francisco-ca',
    city: 'San Francisco',
    stateCode: 'CA',
    region: 'West Coast',
    housing1BR: 4300,
    utilities: 170,
    groceries: 600,
    transport: 120,
    discretionary: 850,
  },
  {
    id: 'san-jose-ca',
    city: 'San Jose',
    stateCode: 'CA',
    region: 'West Coast',
    housing1BR: 2880,
    utilities: 190,
    groceries: 580,
    transport: 190,
    discretionary: 780,
  },
  {
    id: 'los-angeles-ca',
    city: 'Los Angeles',
    stateCode: 'CA',
    region: 'West Coast',
    housing1BR: 2170,
    utilities: 160,
    groceries: 550,
    transport: 200,
    discretionary: 720,
  },
  {
    id: 'san-diego-ca',
    city: 'San Diego',
    stateCode: 'CA',
    region: 'West Coast',
    housing1BR: 2200,
    utilities: 165,
    groceries: 540,
    transport: 195,
    discretionary: 700,
  },
  {
    id: 'seattle-wa',
    city: 'Seattle',
    stateCode: 'WA',
    region: 'West Coast',
    housing1BR: 1930,
    utilities: 150,
    groceries: 560,
    transport: 130,
    discretionary: 720,
  },
  {
    id: 'portland-or',
    city: 'Portland',
    stateCode: 'OR',
    region: 'West Coast',
    housing1BR: 1400,
    utilities: 145,
    groceries: 510,
    transport: 140,
    discretionary: 600,
    localIncomeTaxRate: 0.023,
    localTaxNote:
      'Combined Metro Supportive Housing (1%) and Multnomah County Preschool for All (1.5%+) taxes. Both apply only to income above a threshold, so this flat 2.3% approximation OVERSTATES the tax at low incomes and understates it at high ones.',
  },
]

export const METROS: Metro[] = METRO_SEEDS.map(withHousingTiers)

export const METROS_BY_ID: Record<string, Metro> = Object.fromEntries(
  METROS.map((metro) => [metro.id, metro]),
)

/** Total monthly cost of living for a metro. */
export function monthlyCostOfLiving(metro: Metro): number {
  return (
    metro.housing1BR +
    metro.utilities +
    metro.groceries +
    metro.transport +
    metro.discretionary
  )
}

/** Annual cost of living for a metro. */
export function annualCostOfLiving(metro: Metro): number {
  return monthlyCostOfLiving(metro) * 12
}

/** Mean monthly cost across all metros. Computed once at module load. */
export const MEAN_MONTHLY_COST =
  METROS.reduce((sum, m) => sum + monthlyCostOfLiving(m), 0) / METROS.length

/**
 * Cost index relative to the all-metro mean, where 100 is average.
 * Useful for ranking without re-summing categories at every render.
 */
export function costIndex(metro: Metro): number {
  return (monthlyCostOfLiving(metro) / MEAN_MONTHLY_COST) * 100
}

export interface RegionGroup {
  region: Region
  metros: Metro[]
}

/**
 * Metros bucketed by region in display order, most expensive first inside
 * each bucket. Regions with no matches are omitted, so this doubles as the
 * grouping for filtered search results.
 */
export function groupByRegion(metros: Metro[] = METROS): RegionGroup[] {
  return REGIONS.map((region) => ({
    region,
    metros: metros
      .filter((metro) => metro.region === region)
      .sort((a, b) => monthlyCostOfLiving(b) - monthlyCostOfLiving(a)),
  })).filter((group) => group.metros.length > 0)
}

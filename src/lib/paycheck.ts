/**
 * Presentation-side views of the existing model for the landing page.
 *
 * Nothing here computes tax, cost or growth itself: every figure comes from
 * `computeTakeHome`, `costsFromMetro`/`totalCost` and `simulate`. These
 * helpers only regroup those outputs into the shapes the visuals need —
 * one monthly paycheck split into outflows, and the same salary run across
 * every metro.
 */
import type { FilingStatus, HousingTier, Metro } from '../data/metroData'
import { METROS } from '../data/metroData'
import type { CostBreakdown } from './costs'
import { costsFromMetro, totalCost } from './costs'
import type { SimulationResult } from './simulation'
import { simulate } from './simulation'
import type { TakeHomeBreakdown } from './tax'
import { computeTakeHome } from './tax'

export type PaycheckGroupKey = 'tax' | 'housing' | 'living' | 'kept'

export interface PaycheckPart {
  label: string
  /** Monthly dollars. */
  amount: number
}

export interface PaycheckGroup {
  key: PaycheckGroupKey
  label: string
  /** Monthly dollars. For costs in a deficit this is the full bill, not the part gross can cover. */
  amount: number
  parts: PaycheckPart[]
}

export interface Paycheck {
  /** Monthly gross pay. */
  gross: number
  /** Monthly take-home after every tax. */
  net: number
  groups: PaycheckGroup[]
  /** Monthly costs beyond take-home, zero when the budget balances. */
  shortfall: number
}

/** One month of pay, split in the order money actually leaves it. */
export function paycheckFrom(
  takeHome: TakeHomeBreakdown,
  costs: CostBreakdown,
): Paycheck {
  const gross = takeHome.gross / 12
  const net = takeHome.netMonthly
  const living = totalCost(costs) - costs.housing
  const kept = net - totalCost(costs)
  return {
    gross,
    net,
    shortfall: Math.max(0, -kept),
    groups: [
      {
        key: 'tax',
        label: 'Taxes',
        amount: takeHome.totalTax / 12,
        parts: [
          { label: 'Federal income tax', amount: takeHome.federal / 12 },
          {
            label: 'Social Security & Medicare',
            amount: (takeHome.socialSecurity + takeHome.medicare) / 12,
          },
          { label: 'State & local income tax', amount: (takeHome.state + takeHome.local) / 12 },
        ],
      },
      {
        key: 'housing',
        label: 'Rent',
        amount: costs.housing,
        parts: [{ label: 'Rent', amount: costs.housing }],
      },
      {
        key: 'living',
        label: 'Living costs',
        amount: living,
        parts: [
          { label: 'Utilities', amount: costs.utilities },
          { label: 'Groceries', amount: costs.groceries },
          { label: 'Transport', amount: costs.transport },
          { label: 'Discretionary', amount: costs.discretionary },
        ],
      },
      {
        key: 'kept',
        label: 'Kept',
        amount: Math.max(0, kept),
        parts: [{ label: 'Left to save or invest', amount: Math.max(0, kept) }],
      },
    ],
  }
}

/** Dollar values a single dot can stand for, smallest first. */
const DOT_UNITS = [2, 5, 10, 20, 25, 50, 100, 250, 500]

/**
 * The smallest round dollar value per dot that keeps a month of gross pay
 * within `maxDots`. Round units keep the legend readable ("each dot = $10").
 */
export function dotUnit(monthlyGross: number, maxDots: number): number {
  for (const unit of DOT_UNITS) {
    if (monthlyGross / unit <= maxDots) return unit
  }
  return DOT_UNITS[DOT_UNITS.length - 1]
}

/**
 * Split `total` whole units across `weights` by largest remainder, so the
 * parts always add back up to exactly `total` and no share is lost to
 * rounding.
 */
export function apportion(total: number, weights: number[]): number[] {
  const safe = weights.map((w) => Math.max(0, w))
  const sum = safe.reduce((a, b) => a + b, 0)
  if (total <= 0 || sum <= 0) return safe.map(() => 0)
  const exact = safe.map((w) => (w / sum) * total)
  const floors = exact.map(Math.floor)
  let left = total - floors.reduce((a, b) => a + b, 0)
  const order = exact
    .map((value, i) => ({ i, rem: value - floors[i] }))
    .sort((a, b) => b.rem - a.rem)
  for (const { i } of order) {
    if (left <= 0) break
    floors[i] += 1
    left -= 1
  }
  return floors
}

export interface DotCounts {
  unit: number
  /** Dots per group, then per part within each group. Sums to the gross dots. */
  groups: { key: PaycheckGroupKey; count: number; parts: number[] }[]
  /** Hollow dots drawn past gross for costs that take-home cannot cover. */
  shortfall: number
}

/**
 * Turn a paycheck into dot counts. Gross pay is a fixed pool of dots; in a
 * deficit the cost groups can only fill what take-home leaves, and the
 * overrun is counted separately as shortfall.
 */
export function dotCounts(paycheck: Paycheck, maxDots: number): DotCounts {
  /* Size the unit for everything drawn, shortfall included, so a deficit
     never pushes the field past its dot budget. */
  const unit = dotUnit(paycheck.gross + paycheck.shortfall, maxDots)
  const totalDots = Math.round(paycheck.gross / unit)
  const [tax, housing, living, kept] = paycheck.groups

  /* Costs visible inside gross: housing first, then living, up to take-home. */
  const net = Math.max(0, paycheck.net)
  const housingShown = Math.min(housing.amount, net)
  const livingShown = Math.min(living.amount, net - housingShown)

  const groupCounts = apportion(totalDots, [
    tax.amount,
    housingShown,
    livingShown,
    kept.amount,
  ])

  const livingPartsShown = living.parts.map((p) =>
    living.amount > 0 ? (p.amount / living.amount) * livingShown : 0,
  )

  return {
    unit,
    shortfall: Math.round(paycheck.shortfall / unit),
    groups: [
      { key: 'tax', count: groupCounts[0], parts: apportion(groupCounts[0], tax.parts.map((p) => p.amount)) },
      { key: 'housing', count: groupCounts[1], parts: [groupCounts[1]] },
      { key: 'living', count: groupCounts[2], parts: apportion(groupCounts[2], livingPartsShown) },
      { key: 'kept', count: groupCounts[3], parts: [groupCounts[3]] },
    ],
  }
}

export interface MetroOutcome {
  metro: Metro
  /** Monthly take-home in this metro. */
  net: number
  /** Monthly benchmark costs for the chosen housing tier. */
  cost: number
  /** net − cost. Negative is a monthly shortfall. */
  kept: number
}

/**
 * The same salary run through every metro, using each metro's own taxes and
 * benchmark costs for one housing tier. Sorted from most kept to least.
 */
export function metroOutcomes(
  gross: number,
  filingStatus: FilingStatus,
  tier: HousingTier,
  metros: Metro[] = METROS,
): MetroOutcome[] {
  return metros
    .map((metro) => {
      const takeHome = computeTakeHome({
        gross,
        filingStatus,
        stateCode: metro.stateCode,
        localIncomeTaxRate: metro.localIncomeTaxRate,
        localIncomeTaxThreshold: metro.localIncomeTaxThreshold,
      })
      const cost = totalCost(costsFromMetro(metro, tier))
      return { metro, net: takeHome.netMonthly, cost, kept: takeHome.netMonthly - cost }
    })
    .sort((a, b) => b.kept - a.kept)
}

export interface WealthInput {
  gross: number
  filingStatus: FilingStatus
  tier: HousingTier
  wageGrowth: number
  inflationRate: number
  annualReturn: number
  startingBalance: number
  years: number
}

/**
 * Long-run projection for one metro with no milestones, so metros compare
 * like for like. `costs` defaults to the metro's benchmark basket; pass the
 * user's own basket for their home metro.
 */
export function wealthFor(
  metroId: string,
  input: WealthInput,
  costs?: CostBreakdown,
): SimulationResult {
  const metro = METROS.find((m) => m.id === metroId) ?? METROS[0]
  return simulate({
    startingGross: input.gross,
    filingStatus: input.filingStatus,
    baseMetroId: metro.id,
    baseCosts: costs ?? costsFromMetro(metro, input.tier),
    housingTier: input.tier,
    wageGrowth: input.wageGrowth,
    inflationRate: input.inflationRate,
    annualReturn: input.annualReturn,
    startingBalance: input.startingBalance,
    years: input.years,
    milestones: [],
  })
}

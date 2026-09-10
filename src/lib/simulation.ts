import { METROS_BY_ID, housingForTier } from '../data/metroData'
import type { FilingStatus, HousingTier, Metro } from '../data/types'
import type { CostBreakdown } from './costs'
import { COST_CATEGORIES, costsFromMetro } from './costs'
import type { Milestone } from './milestones'
import { describeMilestone, sortMilestones } from './milestones'
import { computeTakeHome } from './tax'

/**
 * Year-by-year cash-flow and portfolio simulation.
 *
 * Phase 1's `projectInvestment` assumes one fixed monthly contribution for
 * the whole horizon. That cannot express a raise, a relocation, or a new
 * expense, so this engine recomputes tax and cost of living for every year
 * and feeds the resulting surplus into the compounding loop.
 *
 * Conventions, all deliberate and all testable:
 *
 *  - **Dollars.** Every user-supplied amount is stated in the dollars of the
 *    year it takes effect and inflates at `inflationRate` from there. The
 *    base cost basket takes effect in year 1. Salary is the exception: it is
 *    nominal, and grows at `wageGrowth`.
 *  - **Salary steps** reset the salary in their year; baseline wage growth
 *    then resumes compounding from that new figure.
 *  - **Relocation** re-seeds the whole cost basket from the destination
 *    metro's benchmarks and switches the state and local tax jurisdiction.
 *    Manual Phase-2 edits do not survive a relocation, because the new
 *    metro's baseline is what "recalculate baseline expenses" means.
 *  - **A housing milestone** overrides the housing line until a later
 *    relocation or housing milestone replaces it. An explicit dollar
 *    amount is denominated in its own year; a tier switch resolves against
 *    the metro in force and is denominated in that basket's year, so with
 *    no relocation a tier's present-day benchmark inflates to the switch
 *    year and carries forward.
 *  - **Expense deltas** are cumulative and permanent from their year.
 *  - **A deficit year contributes zero** rather than draining the portfolio,
 *    matching the behaviour already established in `projectInvestment`. The
 *    negative surplus is still reported so the UI can flag the year.
 */

export interface SimulationInput {
  startingGross: number
  filingStatus: FilingStatus
  baseMetroId: string
  /** The user's (possibly edited) year-1 monthly cost basket. */
  baseCosts: CostBreakdown
  /** Housing tier in force at year 1, used to re-seed after a relocation. */
  housingTier: HousingTier
  /** Baseline annual salary increase, e.g. 0.035. */
  wageGrowth: number
  /** Drives both real-dollar deflation and cost-of-living growth. */
  inflationRate: number
  /** Blended nominal annual return from the allocation. */
  annualReturn: number
  startingBalance: number
  years: number
  milestones: Milestone[]
}

export interface SimulationYear {
  year: number
  grossSalary: number
  /** Annual take-home after federal, state, local and FICA. */
  netTakeHome: number
  annualExpenses: number
  /** netTakeHome − annualExpenses. May be negative. */
  annualSurplus: number
  /** What actually went in: max(0, annualSurplus). */
  invested: number
  cumulativeContributions: number
  nominalBalance: number
  realBalance: number
  /** nominalBalance − cumulativeContributions − startingBalance. */
  growth: number
  metroId: string
  metroLabel: string
  effectiveTaxRate: number
  /** Milestones that took effect in this year, for the tooltip. */
  events: string[]
}

export interface SimulationResult {
  years: SimulationYear[]
  deficitYears: number[]
}

/** Compound `months` of a constant start-of-month contribution. */
function compoundYear(
  balance: number,
  monthlyContribution: number,
  monthlyRate: number,
): number {
  let next = balance
  for (let month = 0; month < 12; month += 1) {
    next = (next + monthlyContribution) * (1 + monthlyRate)
  }
  return next
}

/** The salary in force for `year`, and the year that figure was set. */
function salaryFor(
  year: number,
  startingGross: number,
  wageGrowth: number,
  milestones: Milestone[],
): number {
  let base = Math.max(0, startingGross)
  let baseYear = 1

  for (const milestone of milestones) {
    if (milestone.kind !== 'salary' || milestone.year > year) continue
    base = Math.max(0, milestone.grossSalary)
    baseYear = milestone.year
  }

  return base * (1 + wageGrowth) ** (year - baseYear)
}

interface CostBasis {
  metro: Metro
  costs: CostBreakdown
  /** The year this basket's figures are denominated in. */
  basisYear: number
}

/** The metro and cost basket in force for `year`, before inflation. */
function costBasisFor(
  year: number,
  baseMetro: Metro,
  baseCosts: CostBreakdown,
  housingTier: HousingTier,
  milestones: Milestone[],
): CostBasis {
  const basis: CostBasis = {
    metro: baseMetro,
    costs: { ...baseCosts },
    basisYear: 1,
  }

  for (const milestone of milestones) {
    if (milestone.kind !== 'relocate' || milestone.year > year) continue
    const metro = METROS_BY_ID[milestone.metroId]
    if (!metro) continue
    basis.metro = metro
    basis.costs = costsFromMetro(metro, housingTier)
    basis.basisYear = milestone.year
  }

  return basis
}

export function simulate({
  startingGross,
  filingStatus,
  baseMetroId,
  baseCosts,
  housingTier,
  wageGrowth,
  inflationRate,
  annualReturn,
  startingBalance,
  years,
  milestones,
}: SimulationInput): SimulationResult {
  const ordered = sortMilestones(milestones)
  const baseMetro = METROS_BY_ID[baseMetroId]
  const monthlyRate = annualReturn / 12
  const openingBalance = Math.max(0, startingBalance)

  const rows: SimulationYear[] = []
  const deficitYears: number[] = []

  let balance = openingBalance
  let contributed = 0

  rows.push({
    year: 0,
    grossSalary: Math.max(0, startingGross),
    netTakeHome: 0,
    annualExpenses: 0,
    annualSurplus: 0,
    invested: 0,
    cumulativeContributions: 0,
    nominalBalance: openingBalance,
    realBalance: openingBalance,
    growth: 0,
    metroId: baseMetro.id,
    metroLabel: `${baseMetro.city}, ${baseMetro.stateCode}`,
    effectiveTaxRate: 0,
    events: [],
  })

  for (let year = 1; year <= years; year += 1) {
    const gross = salaryFor(year, startingGross, wageGrowth, ordered)
    const basis = costBasisFor(
      year,
      baseMetro,
      baseCosts,
      housingTier,
      ordered,
    )

    /* Housing can be overridden after the basket was set, but only by a
       milestone at or after the basket's own year — a relocation later than
       a housing change replaces it. A tier switch reads the benchmark off
       the metro in force and inherits that basket's denomination year; an
       explicit dollar figure is denominated in the milestone's own year. */
    let housing = basis.costs.housing
    let housingYear = basis.basisYear
    for (const milestone of ordered) {
      if (milestone.year > year || milestone.year < basis.basisYear) continue
      if (milestone.kind === 'housing') {
        housing = Math.max(0, milestone.housing)
        housingYear = milestone.year
      } else if (milestone.kind === 'housingTier') {
        housing = housingForTier(basis.metro, milestone.tier)
        housingYear = basis.basisYear
      }
    }

    const nonHousing = COST_CATEGORIES.filter(
      (c) => c.key !== 'housing',
    ).reduce((sum, c) => sum + basis.costs[c.key], 0)

    let monthlyCost =
      nonHousing * (1 + inflationRate) ** (year - basis.basisYear) +
      housing * (1 + inflationRate) ** (year - housingYear)

    const events: string[] = []
    for (const milestone of ordered) {
      if (milestone.year === year) events.push(describeMilestone(milestone))
      if (milestone.kind !== 'expense' || milestone.year > year) continue
      monthlyCost +=
        milestone.delta * (1 + inflationRate) ** (year - milestone.year)
    }

    const takeHome = computeTakeHome({
      gross,
      filingStatus,
      stateCode: basis.metro.stateCode,
      localIncomeTaxRate: basis.metro.localIncomeTaxRate,
      localIncomeTaxThreshold: basis.metro.localIncomeTaxThreshold,
    })

    const annualExpenses = Math.max(0, monthlyCost) * 12
    const annualSurplus = takeHome.net - annualExpenses
    const invested = Math.max(0, annualSurplus)

    if (annualSurplus < 0) deficitYears.push(year)

    balance = compoundYear(balance, invested / 12, monthlyRate)
    contributed += invested

    rows.push({
      year,
      grossSalary: gross,
      netTakeHome: takeHome.net,
      annualExpenses,
      annualSurplus,
      invested,
      cumulativeContributions: contributed,
      nominalBalance: balance,
      realBalance: balance / (1 + inflationRate) ** year,
      growth: balance - contributed - openingBalance,
      metroId: basis.metro.id,
      metroLabel: `${basis.metro.city}, ${basis.metro.stateCode}`,
      effectiveTaxRate: takeHome.effectiveRate,
      events,
    })
  }

  return { years: rows, deficitYears }
}

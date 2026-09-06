import { describe, expect, it } from 'vitest'
import { METROS_BY_ID } from '../data/metroData'
import { costsFromMetro, totalCost } from './costs'
import { projectInvestment } from './forecast'
import type { Milestone } from './milestones'
import { simulate } from './simulation'
import type { SimulationInput } from './simulation'
import { computeTakeHome } from './tax'

const AUSTIN = METROS_BY_ID['austin-tx']

function baseInput(overrides: Partial<SimulationInput> = {}): SimulationInput {
  return {
    startingGross: 150_000,
    filingStatus: 'single',
    baseMetroId: 'austin-tx',
    baseCosts: costsFromMetro(AUSTIN, 'one_bed'),
    housingTier: 'one_bed',
    wageGrowth: 0,
    inflationRate: 0,
    annualReturn: 0.07,
    startingBalance: 0,
    years: 10,
    milestones: [],
    ...overrides,
  }
}

describe('simulate — shape and year 0', () => {
  it('returns years + 1 rows starting at year 0', () => {
    const { years } = simulate(baseInput({ years: 20 }))
    expect(years).toHaveLength(21)
    expect(years[0].year).toBe(0)
    expect(years[20].year).toBe(20)
  })

  it('seeds year 0 with the opening balance and no contributions', () => {
    const { years } = simulate(baseInput({ startingBalance: 25_000 }))
    expect(years[0]).toMatchObject({
      nominalBalance: 25_000,
      realBalance: 25_000,
      cumulativeContributions: 0,
      growth: 0,
    })
  })
})

describe('simulate — agreement with the Phase 1 engine', () => {
  it('matches projectInvestment when nothing varies year to year', () => {
    const input = baseInput({ years: 20, startingBalance: 5_000 })
    const { years } = simulate(input)

    const takeHome = computeTakeHome({
      gross: 150_000,
      filingStatus: 'single',
      stateCode: 'TX',
    })
    const monthlySurplus = takeHome.netMonthly - totalCost(costsFromMetro(AUSTIN, 'one_bed'))

    const reference = projectInvestment({
      startingBalance: 5_000,
      monthlyContribution: monthlySurplus,
      annualReturn: 0.07,
      inflationRate: 0,
      years: 20,
    })

    // Same contributions, same compounding, so the two engines must agree.
    expect(years[20].nominalBalance).toBeCloseTo(reference[20].nominal, 4)
    expect(years[20].cumulativeContributions).toBeCloseTo(
      reference[20].contributions,
      4,
    )
  })
})

describe('simulate — wage growth', () => {
  it('compounds the baseline raise', () => {
    const { years } = simulate(baseInput({ wageGrowth: 0.035, years: 5 }))
    expect(years[1].grossSalary).toBeCloseTo(150_000, 6)
    expect(years[2].grossSalary).toBeCloseTo(150_000 * 1.035, 6)
    expect(years[5].grossSalary).toBeCloseTo(150_000 * 1.035 ** 4, 6)
  })

  it('leaves salary flat at zero growth', () => {
    const { years } = simulate(baseInput({ wageGrowth: 0, years: 5 }))
    expect(years[5].grossSalary).toBeCloseTo(150_000, 6)
  })
})

describe('simulate — salary milestones', () => {
  const step: Milestone = {
    id: 'a',
    year: 3,
    kind: 'salary',
    grossSalary: 200_000,
  }

  it('overrides the baseline in its year', () => {
    const { years } = simulate(
      baseInput({ wageGrowth: 0.035, years: 6, milestones: [step] }),
    )
    expect(years[2].grossSalary).toBeCloseTo(150_000 * 1.035, 6)
    expect(years[3].grossSalary).toBeCloseTo(200_000, 6)
  })

  it('resumes baseline growth from the new figure', () => {
    const { years } = simulate(
      baseInput({ wageGrowth: 0.035, years: 6, milestones: [step] }),
    )
    expect(years[4].grossSalary).toBeCloseTo(200_000 * 1.035, 6)
    expect(years[6].grossSalary).toBeCloseTo(200_000 * 1.035 ** 3, 6)
  })

  it('applies the latest step when two are stacked', () => {
    const { years } = simulate(
      baseInput({
        years: 8,
        milestones: [
          step,
          { id: 'b', year: 6, kind: 'salary', grossSalary: 260_000 },
        ],
      }),
    )
    expect(years[5].grossSalary).toBeCloseTo(200_000, 6)
    expect(years[6].grossSalary).toBeCloseTo(260_000, 6)
  })

  it('records the milestone against the year it fires', () => {
    const { years } = simulate(baseInput({ years: 5, milestones: [step] }))
    expect(years[3].events).toContain('Salary becomes $200,000')
    expect(years[2].events).toHaveLength(0)
  })
})

describe('simulate — relocation', () => {
  const move: Milestone = {
    id: 'r',
    year: 4,
    kind: 'relocate',
    metroId: 'new-york-ny',
  }

  it('switches metro, tax jurisdiction and cost basket', () => {
    const { years } = simulate(baseInput({ years: 6, milestones: [move] }))

    expect(years[3].metroId).toBe('austin-tx')
    expect(years[4].metroId).toBe('new-york-ny')

    const nyc = METROS_BY_ID['new-york-ny']
    expect(years[4].annualExpenses).toBeCloseTo(
      totalCost(costsFromMetro(nyc, 'one_bed')) * 12,
      6,
    )
  })

  it('raises the effective tax rate moving from TX to NY', () => {
    const { years } = simulate(baseInput({ years: 6, milestones: [move] }))
    expect(years[4].effectiveTaxRate).toBeGreaterThan(years[3].effectiveTaxRate)
  })

  it('discards manual cost edits in favour of the new metro baseline', () => {
    const edited = { ...costsFromMetro(AUSTIN, 'one_bed'), housing: 999 }
    const { years } = simulate(
      baseInput({ years: 6, baseCosts: edited, milestones: [move] }),
    )
    const nyc = METROS_BY_ID['new-york-ny']
    expect(years[3].annualExpenses).toBeCloseTo(totalCost(edited) * 12, 6)
    expect(years[4].annualExpenses).toBeCloseTo(
      totalCost(costsFromMetro(nyc, 'one_bed')) * 12,
      6,
    )
  })
})

describe('simulate — housing and expense milestones', () => {
  it('overrides housing from its year forward', () => {
    const housing: Milestone = { id: 'h', year: 3, kind: 'housing', housing: 3_000 }
    const { years } = simulate(baseInput({ years: 5, milestones: [housing] }))

    const others = totalCost(costsFromMetro(AUSTIN, 'one_bed')) - AUSTIN.housing1BR
    expect(years[2].annualExpenses).toBeCloseTo(
      totalCost(costsFromMetro(AUSTIN, 'one_bed')) * 12,
      6,
    )
    expect(years[3].annualExpenses).toBeCloseTo((others + 3_000) * 12, 6)
  })

  it('lets a later relocation replace an earlier housing override', () => {
    const { years } = simulate(
      baseInput({
        years: 8,
        milestones: [
          { id: 'h', year: 2, kind: 'housing', housing: 3_000 },
          { id: 'r', year: 5, kind: 'relocate', metroId: 'denver-co' },
        ],
      }),
    )
    const denver = METROS_BY_ID['denver-co']
    expect(years[5].annualExpenses).toBeCloseTo(
      totalCost(costsFromMetro(denver, 'one_bed')) * 12,
      6,
    )
  })

  it('adds expense deltas cumulatively and permanently', () => {
    const { years } = simulate(
      baseInput({
        years: 6,
        milestones: [
          { id: 'e1', year: 2, kind: 'expense', delta: 500, label: 'Child' },
          { id: 'e2', year: 4, kind: 'expense', delta: -400, label: 'Debt paid' },
        ],
      }),
    )
    const base = totalCost(costsFromMetro(AUSTIN, 'one_bed'))
    expect(years[1].annualExpenses).toBeCloseTo(base * 12, 6)
    expect(years[2].annualExpenses).toBeCloseTo((base + 500) * 12, 6)
    expect(years[3].annualExpenses).toBeCloseTo((base + 500) * 12, 6)
    expect(years[4].annualExpenses).toBeCloseTo((base + 100) * 12, 6)
    expect(years[6].annualExpenses).toBeCloseTo((base + 100) * 12, 6)
  })
})

describe('simulate — housing tier milestones', () => {
  it('switches to the tier benchmark, inflated to the switch year', () => {
    const { years } = simulate(
      baseInput({
        inflationRate: 0.025,
        years: 6,
        milestones: [
          { id: 't', year: 3, kind: 'housingTier', tier: 'two_bed_solo' },
        ],
      }),
    )
    const base = costsFromMetro(AUSTIN, 'one_bed')
    const nonHousing = totalCost(base) - base.housing

    // Year 2 is still the 1-bed baseline.
    expect(years[2].annualExpenses).toBeCloseTo(totalCost(base) * 1.025 * 12, 6)
    // Year 3 uses the 2-bed benchmark inflated forward two years.
    expect(years[3].annualExpenses).toBeCloseTo(
      (nonHousing * 1.025 ** 2 + AUSTIN.housing2BRSolo * 1.025 ** 2) * 12,
      6,
    )
  })

  it('carries the new tier forward, still inflating', () => {
    const { years } = simulate(
      baseInput({
        inflationRate: 0.025,
        years: 8,
        milestones: [
          { id: 't', year: 3, kind: 'housingTier', tier: 'roommate' },
        ],
      }),
    )
    const base = costsFromMetro(AUSTIN, 'one_bed')
    const nonHousing = totalCost(base) - base.housing
    expect(years[6].annualExpenses).toBeCloseTo(
      (nonHousing * 1.025 ** 5 + AUSTIN.housingRoommate * 1.025 ** 5) * 12,
      6,
    )
  })

  it('cuts expenses when moving down a tier and raises them moving up', () => {
    const down = simulate(
      baseInput({
        years: 4,
        milestones: [
          { id: 'd', year: 2, kind: 'housingTier', tier: 'roommate' },
        ],
      }),
    )
    const up = simulate(
      baseInput({
        years: 4,
        milestones: [
          { id: 'u', year: 2, kind: 'housingTier', tier: 'two_bed_solo' },
        ],
      }),
    )
    expect(down.years[2].annualExpenses).toBeLessThan(
      down.years[1].annualExpenses,
    )
    expect(up.years[2].annualExpenses).toBeGreaterThan(
      up.years[1].annualExpenses,
    )
    expect(down.years[4].annualSurplus).toBeGreaterThan(
      up.years[4].annualSurplus,
    )
  })

  it('resolves the tier against the metro in force after a relocation', () => {
    const { years } = simulate(
      baseInput({
        inflationRate: 0.025,
        years: 8,
        milestones: [
          { id: 'r', year: 4, kind: 'relocate', metroId: 'new-york-ny' },
          { id: 't', year: 6, kind: 'housingTier', tier: 'roommate' },
        ],
      }),
    )
    const nyc = METROS_BY_ID['new-york-ny']
    const nycBase = costsFromMetro(nyc, 'one_bed')
    const nonHousing = totalCost(nycBase) - nycBase.housing
    // The NYC basket is denominated in year 4, so both parts inflate from there.
    expect(years[6].annualExpenses).toBeCloseTo(
      (nonHousing * 1.025 ** 2 + nyc.housingRoommate * 1.025 ** 2) * 12,
      6,
    )
  })

  it('lets a later explicit rent figure override an earlier tier switch', () => {
    const { years } = simulate(
      baseInput({
        years: 8,
        milestones: [
          { id: 't', year: 2, kind: 'housingTier', tier: 'two_bed_solo' },
          { id: 'h', year: 5, kind: 'housing', housing: 1_000 },
        ],
      }),
    )
    const base = costsFromMetro(AUSTIN, 'one_bed')
    const nonHousing = totalCost(base) - base.housing
    expect(years[5].annualExpenses).toBeCloseTo((nonHousing + 1_000) * 12, 6)
  })

  it('lets a later tier switch override an earlier explicit rent figure', () => {
    const { years } = simulate(
      baseInput({
        years: 8,
        milestones: [
          { id: 'h', year: 2, kind: 'housing', housing: 9_000 },
          { id: 't', year: 5, kind: 'housingTier', tier: 'studio' },
        ],
      }),
    )
    const base = costsFromMetro(AUSTIN, 'one_bed')
    const nonHousing = totalCost(base) - base.housing
    expect(years[5].annualExpenses).toBeCloseTo(
      (nonHousing + AUSTIN.housingStudio) * 12,
      6,
    )
  })

  it('re-seeds housing from the base tier when relocating', () => {
    const { years } = simulate(
      baseInput({
        housingTier: 'roommate',
        baseCosts: costsFromMetro(AUSTIN, 'roommate'),
        years: 6,
        milestones: [
          { id: 'r', year: 4, kind: 'relocate', metroId: 'denver-co' },
        ],
      }),
    )
    const denver = METROS_BY_ID['denver-co']
    expect(years[4].annualExpenses).toBeCloseTo(
      totalCost(costsFromMetro(denver, 'roommate')) * 12,
      6,
    )
  })

  it('names the tier in the milestone event text', () => {
    const { years } = simulate(
      baseInput({
        years: 4,
        milestones: [
          { id: 't', year: 2, kind: 'housingTier', tier: 'two_bed_solo' },
        ],
      }),
    )
    expect(years[2].events).toContain('Switch to 2-Bed Solo')
  })
})

describe('simulate — inflation', () => {
  it('grows the base basket from year 1', () => {
    const { years } = simulate(baseInput({ inflationRate: 0.025, years: 5 }))
    const base = totalCost(costsFromMetro(AUSTIN, 'one_bed'))
    expect(years[1].annualExpenses).toBeCloseTo(base * 12, 6)
    expect(years[3].annualExpenses).toBeCloseTo(base * 1.025 ** 2 * 12, 6)
  })

  it('denominates a milestone amount in its own year, then inflates it', () => {
    const { years } = simulate(
      baseInput({
        inflationRate: 0.025,
        years: 6,
        milestones: [
          { id: 'e', year: 3, kind: 'expense', delta: 500, label: 'Car' },
        ],
      }),
    )
    const base = totalCost(costsFromMetro(AUSTIN, 'one_bed'))
    // The $500 is a year-3 figure, so year 3 carries exactly $500 of it.
    expect(years[3].annualExpenses).toBeCloseTo(
      (base * 1.025 ** 2 + 500) * 12,
      6,
    )
    expect(years[5].annualExpenses).toBeCloseTo(
      (base * 1.025 ** 4 + 500 * 1.025 ** 2) * 12,
      6,
    )
  })

  it('deflates the real series while leaving nominal alone', () => {
    const { years } = simulate(baseInput({ inflationRate: 0.025, years: 10 }))
    expect(years[10].realBalance).toBeCloseTo(
      years[10].nominalBalance / 1.025 ** 10,
      6,
    )
    expect(years[10].realBalance).toBeLessThan(years[10].nominalBalance)
  })
})

describe('simulate — deficits', () => {
  it('contributes nothing in a deficit year and flags it', () => {
    const { years, deficitYears } = simulate(
      baseInput({
        startingGross: 45_000,
        baseMetroId: 'new-york-ny',
        baseCosts: costsFromMetro(METROS_BY_ID['new-york-ny'], 'one_bed'),
        years: 3,
        annualReturn: 0,
      }),
    )
    expect(years[1].annualSurplus).toBeLessThan(0)
    expect(years[1].invested).toBe(0)
    expect(deficitYears).toContain(1)
  })

  it('holds the balance flat through a deficit rather than draining it', () => {
    const { years } = simulate(
      baseInput({
        startingGross: 45_000,
        baseMetroId: 'new-york-ny',
        baseCosts: costsFromMetro(METROS_BY_ID['new-york-ny'], 'one_bed'),
        startingBalance: 10_000,
        annualReturn: 0,
        years: 3,
      }),
    )
    expect(years[3].nominalBalance).toBeCloseTo(10_000, 6)
  })
})

describe('simulate — accounting identities', () => {
  it('keeps growth equal to balance minus contributions minus opening', () => {
    const { years } = simulate(
      baseInput({
        startingBalance: 12_000,
        wageGrowth: 0.035,
        inflationRate: 0.025,
        years: 25,
        milestones: [
          { id: 's', year: 5, kind: 'salary', grossSalary: 210_000 },
          { id: 'r', year: 9, kind: 'relocate', metroId: 'seattle-wa' },
          { id: 'e', year: 12, kind: 'expense', delta: 700, label: 'Child' },
        ],
      }),
    )
    for (const row of years) {
      expect(row.growth).toBeCloseTo(
        row.nominalBalance - row.cumulativeContributions - 12_000,
        4,
      )
    }
  })

  it('accumulates contributions as the running sum of what was invested', () => {
    const { years } = simulate(baseInput({ wageGrowth: 0.04, years: 12 }))
    let running = 0
    for (const row of years.slice(1)) {
      running += row.invested
      expect(row.cumulativeContributions).toBeCloseTo(running, 4)
    }
  })

  it('never lets the balance fall below the opening balance with no deficits', () => {
    const { years, deficitYears } = simulate(
      baseInput({ startingBalance: 1_000, years: 30 }),
    )
    expect(deficitYears).toHaveLength(0)
    for (const row of years) {
      expect(row.nominalBalance).toBeGreaterThanOrEqual(1_000)
    }
  })
})

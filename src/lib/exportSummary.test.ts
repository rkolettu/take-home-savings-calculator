import { describe, expect, it } from 'vitest'
import { METROS_BY_ID } from '../data/metroData'
import { costsFromMetro } from './costs'
import { buildCsv, buildSummaryText, escapeCsvCell } from './exportSummary'
import { simulate } from './simulation'

const AUSTIN = METROS_BY_ID['austin-tx']

function run(years = 30) {
  return simulate({
    startingGross: 150_000,
    filingStatus: 'single',
    baseMetroId: 'austin-tx',
    baseCosts: costsFromMetro(AUSTIN, 'one_bed'),
    housingTier: 'one_bed',
    wageGrowth: 0.035,
    inflationRate: 0.025,
    annualReturn: 0.085,
    startingBalance: 0,
    years,
    milestones: [
      { id: 'a', year: 5, kind: 'salary', grossSalary: 220_000 },
      { id: 'b', year: 8, kind: 'relocate', metroId: 'new-york-ny' },
    ],
  })
}

describe('escapeCsvCell', () => {
  it('leaves a plain value alone', () => {
    expect(escapeCsvCell('Austin')).toBe('Austin')
  })

  it('quotes a value containing a comma', () => {
    expect(escapeCsvCell('Austin, TX')).toBe('"Austin, TX"')
  })

  it('doubles embedded quotes', () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""')
  })

  it('quotes a value containing a newline', () => {
    expect(escapeCsvCell('a\nb')).toBe('"a\nb"')
  })
})

describe('buildCsv', () => {
  it('emits a header plus one row per year including year 0', () => {
    const csv = buildCsv(run(30))
    const lines = csv.split('\r\n')
    expect(lines).toHaveLength(32)
    expect(lines[0]).toMatch(/^Year,Metro,Gross salary/)
    expect(lines[1]).toMatch(/^0,/)
    expect(lines[31]).toMatch(/^30,/)
  })

  it('quotes metro labels, which always contain a comma', () => {
    expect(buildCsv(run(3))).toContain('"Austin, TX"')
  })

  it('keeps every row at the same column count', () => {
    const lines = buildCsv(run(10)).split('\r\n')
    const expected = lines[0].split(',').length
    for (const line of lines) {
      // Count only unquoted commas, the actual field separators.
      let depth = 0
      let fields = 1
      for (const char of line) {
        if (char === '"') depth = depth === 0 ? 1 : 0
        else if (char === ',' && depth === 0) fields += 1
      }
      expect(fields).toBe(expected)
    }
  })

  it('carries milestone events into the events column', () => {
    const csv = buildCsv(run(10))
    expect(csv).toContain('Salary becomes $220,000')
    expect(csv).toContain('Relocate to New York, NY')
  })
})

describe('buildSummaryText', () => {
  const summary = buildSummaryText({
    metro: AUSTIN,
    gross: 150_000,
    netMonthly: 9_482.6,
    monthlyCost: 3_080,
    surplus: 6_402.6,
    savingsRate: 0.675,
    effectiveTaxRate: 0.2414,
    annualReturn: 0.085,
    wageGrowth: 0.035,
    inflationRate: 0.025,
    startingBalance: 0,
    result: run(30),
  })

  it('names the metro in the heading', () => {
    expect(summary).toContain('Austin, TX')
  })

  it('reports the headline figures', () => {
    expect(summary).toContain('$150,000/yr')
    expect(summary).toContain('$6,403')
    expect(summary).toContain('67.5%')
  })

  it('includes every checkpoint inside the horizon', () => {
    for (const year of [5, 10, 20, 30]) {
      expect(summary).toContain(`Year ${year}`)
    }
  })

  it('omits checkpoints beyond a shorter horizon', () => {
    const short = buildSummaryText({
      metro: AUSTIN,
      gross: 150_000,
      netMonthly: 9_482.6,
      monthlyCost: 3_080,
      surplus: 6_402.6,
      savingsRate: 0.675,
      effectiveTaxRate: 0.2414,
      annualReturn: 0.085,
      wageGrowth: 0.035,
      inflationRate: 0.025,
      startingBalance: 0,
      result: run(10),
    })
    expect(short).toContain('Year 10')
    expect(short).not.toContain('Year 20')
  })
})

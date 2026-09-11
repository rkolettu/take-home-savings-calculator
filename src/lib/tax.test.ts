import { describe, expect, it } from 'vitest'
import {
  METROS,
  METROS_BY_ID,
  groupByRegion,
  housingForTier,
  monthlyCostOfLiving,
} from '../data/metros'
import { HOUSING_TIERS, REGIONS } from '../data/types'
import { costsFromMetro } from './costs'
import { FEDERAL_BRACKETS, FICA, STATE_TAX } from '../data/taxTables'
import {
  applyBrackets,
  computeTakeHome,
  federalIncomeTax,
  ficaTax,
  marginalRateFor,
  stateIncomeTax,
} from './tax'

describe('applyBrackets', () => {
  it('returns 0 for zero or negative taxable income', () => {
    expect(applyBrackets(0, FEDERAL_BRACKETS.single)).toBe(0)
    expect(applyBrackets(-5000, FEDERAL_BRACKETS.single)).toBe(0)
  })

  it('taxes income exactly at a bracket ceiling at the lower rate only', () => {
    // $12,400 is the top of the 10% bracket for a single filer.
    expect(applyBrackets(12_400, FEDERAL_BRACKETS.single)).toBeCloseTo(1_240, 6)
  })

  it('taxes the first dollar past a ceiling at the next rate', () => {
    expect(applyBrackets(12_401, FEDERAL_BRACKETS.single)).toBeCloseTo(
      1_240.12,
      6,
    )
  })

  it('stacks three brackets correctly', () => {
    // 10% x 12,400 = 1,240
    // 12% x 38,000 = 4,560
    // 22% x 33,500 = 7,370
    expect(applyBrackets(83_900, FEDERAL_BRACKETS.single)).toBeCloseTo(
      13_170,
      6,
    )
  })
})

describe('marginalRateFor', () => {
  it('reports 0 at zero taxable income', () => {
    expect(marginalRateFor(0, FEDERAL_BRACKETS.single)).toBe(0)
  })

  it('reports the bracket a filer sits inside', () => {
    expect(marginalRateFor(83_900, FEDERAL_BRACKETS.single)).toBe(0.22)
  })

  it('reports the top rate above the final threshold', () => {
    expect(marginalRateFor(2_000_000, FEDERAL_BRACKETS.single)).toBe(0.37)
  })
})

describe('federalIncomeTax', () => {
  it('applies the 2026 standard deduction before bracketing', () => {
    // $100,000 gross - $16,100 deduction = $83,900 taxable.
    expect(federalIncomeTax(100_000, 'single')).toBeCloseTo(13_170, 6)
  })

  it('owes nothing when gross is below the standard deduction', () => {
    expect(federalIncomeTax(15_000, 'single')).toBe(0)
  })
})

describe('ficaTax', () => {
  it('caps Social Security at the wage base', () => {
    const { socialSecurity } = ficaTax(300_000, 'single')
    expect(socialSecurity).toBeCloseTo(
      FICA.socialSecurityWageBase * FICA.socialSecurityRate,
      6,
    )
    expect(socialSecurity).toBeCloseTo(11_439, 6)
  })

  it('does not cap Social Security below the wage base', () => {
    expect(ficaTax(100_000, 'single').socialSecurity).toBeCloseTo(6_200, 6)
  })

  it('skips the additional Medicare surtax below the threshold', () => {
    expect(ficaTax(150_000, 'single').medicare).toBeCloseTo(2_175, 6)
  })

  it('applies the additional Medicare surtax above the threshold', () => {
    // 300,000 x 1.45% = 4,350, plus 100,000 x 0.9% = 900.
    expect(ficaTax(300_000, 'single').medicare).toBeCloseTo(5_250, 6)
  })

  it('uses the higher threshold for joint filers', () => {
    // At 240k a joint filer is still below the 250k threshold.
    expect(ficaTax(240_000, 'marriedJoint').medicare).toBeCloseTo(3_480, 6)
    expect(ficaTax(240_000, 'single').medicare).toBeCloseTo(3_840, 6)
  })
})

describe('stateIncomeTax', () => {
  it.each([
    ['MN', 75_000, 3_576.605],
    ['NY', 75_000, 3_453],
    ['WI', 75_000, 3_334.36],
    ['DE', 75_000, 3_719],
    ['MO', 75_000, 2_587.668],
    ['MD', 75_000, 3_198.875],
    ['CA', 100_000, 5_207.98],
  ] as const)('matches the verified %s schedule before unmodelled credits', (state, gross, expected) => {
    expect(stateIncomeTax(gross, 'single', state)).toBeCloseTo(expected, 2)
  })

  it('returns 0 for states with no wage income tax', () => {
    for (const code of ['TX', 'FL', 'WA', 'NV', 'TN']) {
      expect(stateIncomeTax(150_000, 'single', code)).toBe(0)
    }
  })

  it('returns 0 for an unmapped state code rather than throwing', () => {
    expect(stateIncomeTax(150_000, 'single', 'ZZ')).toBe(0)
  })

  it('applies a flat rate after deductions', () => {
    // Pennsylvania: flat 3.07% on gross, no deductions.
    expect(stateIncomeTax(100_000, 'single', 'PA')).toBeCloseTo(3_070, 6)
  })

  it('subtracts a personal exemption for flat states that grant one', () => {
    // Illinois: (100,000 - 2,850) x 4.95% = 4,808.925
    expect(stateIncomeTax(100_000, 'single', 'IL')).toBeCloseTo(4_808.925, 6)
  })

  it('brackets progressive states', () => {
    // California, single, 100,000 gross - 5,706 deduction = 94,294 taxable.
    const ca = stateIncomeTax(100_000, 'single', 'CA')
    expect(ca).toBeGreaterThan(4_000)
    expect(ca).toBeLessThan(6_500)
  })

  it('taxes a high earner in CA more than in a flat-rate state', () => {
    expect(stateIncomeTax(400_000, 'single', 'CA')).toBeGreaterThan(
      stateIncomeTax(400_000, 'single', 'AZ'),
    )
  })
})

describe('state tax coverage across every metro', () => {
  const metroStates = [...new Set(METROS.map((m) => m.stateCode))].sort()

  it('defines a spec for every jurisdiction a metro sits in', () => {
    for (const code of metroStates) {
      expect(STATE_TAX[code], code).toBeDefined()
      expect(STATE_TAX[code].stateCode, code).toBe(code)
    }
  })

  it('covers exactly the jurisdictions the metro list needs', () => {
    expect(metroStates).toEqual([
      'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'IL', 'IN',
      'LA', 'MA', 'MD', 'MI', 'MN', 'MO', 'NC', 'NV', 'NY', 'OH',
      'OR', 'PA', 'TN', 'TX', 'UT', 'VA', 'WA', 'WI',
    ])
  })

  it('treats exactly the known no-income-tax states as zero', () => {
    const zeroStates = metroStates.filter(
      (code) => stateIncomeTax(150_000, 'single', code) === 0,
    )
    expect(zeroStates).toEqual(['FL', 'NV', 'TN', 'TX', 'WA'])
  })

  it('produces a plausible tax in every taxing state at $150k', () => {
    for (const code of metroStates) {
      if (STATE_TAX[code].kind === 'none') continue
      const tax = stateIncomeTax(150_000, 'single', code)
      // No US state takes under 1% or over 15% of a $150k wage.
      expect(tax, code).toBeGreaterThan(1_500)
      expect(tax, code).toBeLessThan(22_500)
    }
  })

  it('gives every filing status a complete bracket table', () => {
    for (const code of metroStates) {
      const spec = STATE_TAX[code]
      if (spec.kind !== 'progressive') continue
      for (const status of ['single', 'marriedJoint', 'headOfHousehold'] as const) {
        const brackets = spec.brackets[status]
        expect(brackets.length, `${code}/${status}`).toBeGreaterThan(0)
        // Ascending thresholds, open-ended at the top.
        for (let i = 1; i < brackets.length; i += 1) {
          expect(brackets[i].upTo, `${code}/${status}`).toBeGreaterThan(
            brackets[i - 1].upTo,
          )
        }
        expect(brackets[brackets.length - 1].upTo, `${code}/${status}`).toBe(
          Infinity,
        )
      }
    }
  })

  it('never taxes a joint filer more than a single filer on equal income', () => {
    for (const code of metroStates) {
      expect(
        stateIncomeTax(150_000, 'marriedJoint', code),
        code,
      ).toBeLessThanOrEqual(stateIncomeTax(150_000, 'single', code) + 0.01)
    }
  })

  it('carries a note wherever a figure is carried forward from 2025', () => {
    for (const code of metroStates) {
      const spec = STATE_TAX[code]
      if (spec.confidence !== 'carried-from-2025') continue
      expect(spec.note, code).toBeTruthy()
    }
  })
})

describe('computeTakeHome', () => {
  it.each([
    ['single', 75_000, 0],
    ['single', 125_000, 0],
    ['single', 150_000, 575],
    ['marriedJoint', 200_000, 0],
    ['marriedJoint', 225_000, 575],
    ['headOfHousehold', 150_000, 575],
  ] as const)('applies Portland threshold for %s at $%i', (filingStatus, gross, expected) => {
    const result = computeTakeHome({
      ...METROS_BY_ID['portland-or'],
      filingStatus,
      gross,
    })
    expect(result.local).toBeCloseTo(expected, 6)
  })

  it('preserves flat local tax when no threshold is supplied', () => {
    const result = computeTakeHome({
      ...METROS_BY_ID['indianapolis-in'],
      filingStatus: 'single',
      gross: 75_000,
    })
    expect(result.local).toBe(1_515)
  })

  it('nets gross minus every component', () => {
    const r = computeTakeHome({
      gross: 120_000,
      filingStatus: 'single',
      stateCode: 'TX',
    })
    expect(r.totalTax).toBeCloseTo(
      r.federal + r.state + r.local + r.socialSecurity + r.medicare,
      6,
    )
    expect(r.net).toBeCloseTo(r.gross - r.totalTax, 6)
    expect(r.netMonthly).toBeCloseTo(r.net / 12, 6)
  })

  it('leaves a Texan with more take-home than a Californian on equal pay', () => {
    const tx = computeTakeHome({
      gross: 150_000,
      filingStatus: 'single',
      stateCode: 'TX',
    })
    const ca = computeTakeHome({
      gross: 150_000,
      filingStatus: 'single',
      stateCode: 'CA',
    })
    expect(tx.net).toBeGreaterThan(ca.net)
    expect(tx.state).toBe(0)
  })

  it('applies a metro local income tax when one exists', () => {
    const nyc = METROS_BY_ID['new-york-ny']
    const withLocal = computeTakeHome({
      gross: 150_000,
      filingStatus: 'single',
      stateCode: 'NY',
      localIncomeTaxRate: nyc.localIncomeTaxRate,
    })
    const withoutLocal = computeTakeHome({
      gross: 150_000,
      filingStatus: 'single',
      stateCode: 'NY',
    })
    expect(withLocal.local).toBeCloseTo(150_000 * 0.0376, 6)
    expect(withLocal.net).toBeLessThan(withoutLocal.net)
  })

  it('handles zero gross without dividing by zero', () => {
    const r = computeTakeHome({
      gross: 0,
      filingStatus: 'single',
      stateCode: 'CA',
    })
    expect(r.net).toBe(0)
    expect(r.effectiveRate).toBe(0)
  })

  it('clamps negative gross to zero', () => {
    const r = computeTakeHome({
      gross: -50_000,
      filingStatus: 'single',
      stateCode: 'NY',
    })
    expect(r.gross).toBe(0)
    expect(r.totalTax).toBe(0)
  })

  it('keeps the effective rate below the top federal marginal rate', () => {
    const r = computeTakeHome({
      gross: 250_000,
      filingStatus: 'single',
      stateCode: 'NY',
    })
    expect(r.effectiveRate).toBeGreaterThan(0.2)
    expect(r.effectiveRate).toBeLessThan(0.55)
  })
})

describe('metro data integrity', () => {
  it('has exactly 45 metros', () => {
    expect(METROS).toHaveLength(45)
  })

  it('has unique ids', () => {
    expect(new Set(METROS.map((m) => m.id)).size).toBe(45)
  })

  it('assigns every metro a known region', () => {
    for (const metro of METROS) {
      expect(REGIONS, metro.id).toContain(metro.region)
    }
  })

  it('fills every region with the expected number of metros', () => {
    const counts = Object.fromEntries(
      REGIONS.map((region) => [
        region,
        METROS.filter((m) => m.region === region).length,
      ]),
    )
    expect(counts).toEqual({
      Northeast: 9,
      Midwest: 10,
      Southeast: 12,
      'Texas / Southwest': 6,
      Mountain: 2,
      'West Coast': 6,
    })
  })

  it('groups into regions without losing or duplicating a metro', () => {
    const groups = groupByRegion()
    const grouped = groups.flatMap((group) => group.metros)
    expect(grouped).toHaveLength(METROS.length)
    expect(new Set(grouped.map((m) => m.id)).size).toBe(METROS.length)
  })

  it('orders regions for display and sorts each by cost, descending', () => {
    const groups = groupByRegion()
    expect(groups.map((g) => g.region)).toEqual([...REGIONS])
    for (const group of groups) {
      const costs = group.metros.map(monthlyCostOfLiving)
      expect([...costs].sort((a, b) => b - a)).toEqual(costs)
    }
  })

  it('omits regions with no matches when grouping a filtered list', () => {
    const westOnly = METROS.filter((m) => m.region === 'West Coast')
    const groups = groupByRegion(westOnly)
    expect(groups).toHaveLength(1)
    expect(groups[0].region).toBe('West Coast')
  })

  it('gives every local income tax rate a note explaining it', () => {
    for (const metro of METROS) {
      if (metro.localIncomeTaxRate === undefined) continue
      expect(metro.localIncomeTaxRate, metro.id).toBeGreaterThan(0)
      expect(metro.localIncomeTaxRate, metro.id).toBeLessThan(0.1)
      expect(metro.localTaxNote, metro.id).toBeTruthy()
    }
  })

  it('captures a local income tax for every metro known to levy one', () => {
    const expected = [
      'new-york-ny',
      'philadelphia-pa',
      'pittsburgh-pa',
      'baltimore-md',
      'wilmington-de',
      'detroit-mi',
      'columbus-oh',
      'cincinnati-oh',
      'cleveland-oh',
      'indianapolis-in',
      'st-louis-mo',
      'kansas-city-mo',
      'portland-or',
    ]
    for (const id of expected) {
      expect(METROS_BY_ID[id]?.localIncomeTaxRate, id).toBeGreaterThan(0)
    }
  })

  it('maps every metro state code to a tax spec', () => {
    for (const metro of METROS) {
      expect(STATE_TAX[metro.stateCode], metro.stateCode).toBeDefined()
    }
  })

  it('has positive costs in every category', () => {
    for (const metro of METROS) {
      expect(monthlyCostOfLiving(metro)).toBeGreaterThan(0)
      expect(metro.housing1BR).toBeGreaterThan(0)
      expect(metro.utilities).toBeGreaterThan(0)
      expect(metro.groceries).toBeGreaterThan(0)
      expect(metro.transport).toBeGreaterThan(0)
      expect(metro.discretionary).toBeGreaterThan(0)
    }
  })

  it('orders the four housing tiers cheapest to most expensive', () => {
    for (const metro of METROS) {
      expect(metro.housingRoommate, metro.id).toBeLessThan(metro.housingStudio)
      expect(metro.housingStudio, metro.id).toBeLessThan(metro.housing1BR)
      expect(metro.housing1BR, metro.id).toBeLessThan(metro.housing2BRSolo)
    }
  })

  it('keeps the roommate share inside the intended 55-60% band', () => {
    for (const metro of METROS) {
      const ratio = metro.housingRoommate / metro.housing1BR
      expect(ratio, metro.id).toBeGreaterThanOrEqual(0.54)
      expect(ratio, metro.id).toBeLessThanOrEqual(0.61)
    }
  })

  it('holds the studio and 2-bed ratios near their targets', () => {
    for (const metro of METROS) {
      expect(metro.housingStudio / metro.housing1BR, metro.id).toBeCloseTo(
        0.85,
        1,
      )
      expect(metro.housing2BRSolo / metro.housing1BR, metro.id).toBeCloseTo(
        1.35,
        1,
      )
    }
  })

  it('quotes every derived tier in round tens', () => {
    for (const metro of METROS) {
      for (const value of [
        metro.housingRoommate,
        metro.housingStudio,
        metro.housing2BRSolo,
      ]) {
        expect(value % 10, metro.id).toBe(0)
      }
    }
  })

  it('resolves each tier to its own benchmark field', () => {
    const nyc = METROS_BY_ID['new-york-ny']
    expect(housingForTier(nyc, 'roommate')).toBe(nyc.housingRoommate)
    expect(housingForTier(nyc, 'studio')).toBe(nyc.housingStudio)
    expect(housingForTier(nyc, 'one_bed')).toBe(nyc.housing1BR)
    expect(housingForTier(nyc, 'two_bed_solo')).toBe(nyc.housing2BRSolo)
  })

  it('seeds the budget housing line from the chosen tier', () => {
    const nyc = METROS_BY_ID['new-york-ny']
    for (const tier of HOUSING_TIERS) {
      expect(costsFromMetro(nyc, tier).housing).toBe(housingForTier(nyc, tier))
    }
    // Roommate is the default when no tier is named.
    expect(costsFromMetro(nyc).housing).toBe(nyc.housingRoommate)
  })

  it('leaves the non-housing lines untouched by the tier', () => {
    const nyc = METROS_BY_ID['new-york-ny']
    // Compared against the default tier rather than the raw metro fields: a
    // sourced layer may legitimately move a line, but never per housing tier.
    const baseline = costsFromMetro(nyc)
    for (const tier of HOUSING_TIERS) {
      const costs = costsFromMetro(nyc, tier)
      expect(costs.utilities).toBe(baseline.utilities)
      expect(costs.groceries).toBe(baseline.groceries)
      expect(costs.transport).toBe(baseline.transport)
      expect(costs.discretionary).toBe(baseline.discretionary)
    }
  })

  it('makes New York the most expensive metro', () => {
    const sorted = [...METROS].sort(
      (a, b) => monthlyCostOfLiving(b) - monthlyCostOfLiving(a),
    )
    expect(sorted[0].id).toBe('new-york-ny')
  })
})

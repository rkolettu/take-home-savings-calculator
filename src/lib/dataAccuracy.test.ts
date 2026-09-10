import { describe, expect, it } from 'vitest'
import { METROS_BY_ID } from '../data/metros'
import { STATE_TAX } from '../data/taxTables'
import { computeTakeHome } from './tax'

const AUGUST_2026_1BR: Record<string, number> = {
  'new-york-ny': 4500,
  'boston-ma': 2960,
  'stamford-ct': 2300,
  'washington-dc': 2220,
  'philadelphia-pa': 1450,
  'hartford-ct': 1410,
  'baltimore-md': 1220,
  'wilmington-de': 1240,
  'pittsburgh-pa': 1350,
  'chicago-il': 2190,
  'minneapolis-mn': 1280,
  'columbus-oh': 1190,
  'milwaukee-wi': 1100,
  'kansas-city-mo': 1160,
  'indianapolis-in': 1040,
  'cincinnati-oh': 1080,
  'st-louis-mo': 1010,
  'detroit-mi': 940,
  'cleveland-oh': 1200,
  'miami-fl': 2550,
  'palm-beach-fl': 2120,
  'naples-fl': 2030,
  'tampa-fl': 1500,
  'atlanta-ga': 1660,
  'orlando-fl': 1450,
  'nashville-tn': 1520,
  'charlotte-nc': 1430,
  'raleigh-durham-nc': 1295,
  'jacksonville-fl': 1110,
  'new-orleans-la': 1430,
  'richmond-va': 1410,
  'austin-tx': 1260,
  'dallas-tx': 1270,
  'phoenix-az': 1190,
  'las-vegas-nv': 1150,
  'houston-tx': 1050,
  'san-antonio-tx': 960,
  'denver-co': 1540,
  'salt-lake-city-ut': 1200,
  'san-francisco-ca': 4300,
  'san-jose-ca': 2880,
  'los-angeles-ca': 2170,
  'san-diego-ca': 2200,
  'seattle-wa': 1930,
  'portland-or': 1400,
}

const INTERPOLATED = [
  'stamford-ct',
  'hartford-ct',
  'wilmington-de',
  'palm-beach-fl',
  'naples-fl',
]

describe('August 2026 metro housing data', () => {
  it('matches all 45 verified 1BR anchors', () => {
    expect(Object.keys(AUGUST_2026_1BR)).toHaveLength(45)
    for (const [id, rent] of Object.entries(AUGUST_2026_1BR)) {
      expect(METROS_BY_ID[id], id).toBeDefined()
      expect(METROS_BY_ID[id].housing1BR, id).toBe(rent)
    }
  })

  it('flags only the five interpolated rent anchors', () => {
    for (const [id, metro] of Object.entries(METROS_BY_ID)) {
      if (INTERPOLATED.includes(id)) {
        expect(metro.housingConfidence, id).toBe('interpolated')
      } else {
        expect(metro.housingConfidence, id).toBeUndefined()
      }
    }
  })
})

describe('2026 local and state tax corrections', () => {
  it('keeps the verified Marion County and Detroit resident rates', () => {
    expect(METROS_BY_ID['indianapolis-in'].localIncomeTaxRate).toBe(0.0202)
    expect(METROS_BY_ID['detroit-mi'].localIncomeTaxRate).toBe(0.024)
    expect(METROS_BY_ID['philadelphia-pa'].localIncomeTaxRate).toBe(0.03735)
  })

  it('uses the published 2026 Utah rate', () => {
    expect(STATE_TAX.UT.vintage).toBe(2026)
    expect(STATE_TAX.UT.confidence).toBe('published-2026')
    expect(STATE_TAX.UT.kind).toBe('flat')
    if (STATE_TAX.UT.kind === 'flat') expect(STATE_TAX.UT.rate).toBe(0.0445)
  })

  it('applies Portland local tax only above the filing-status threshold', () => {
    const portland = METROS_BY_ID['portland-or']
    const below = computeTakeHome({
      gross: 75_000,
      filingStatus: 'single',
      stateCode: 'OR',
      localIncomeTaxRate: portland.localIncomeTaxRate,
      localIncomeTaxThreshold: portland.localIncomeTaxThreshold,
    })
    const above = computeTakeHome({
      gross: 150_000,
      filingStatus: 'single',
      stateCode: 'OR',
      localIncomeTaxRate: portland.localIncomeTaxRate,
      localIncomeTaxThreshold: portland.localIncomeTaxThreshold,
    })

    expect(below.local).toBe(0)
    expect(above.local).toBeCloseTo((150_000 - 125_000) * 0.023, 6)
  })
})

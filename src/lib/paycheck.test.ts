import { describe, expect, it } from 'vitest'
import { METROS_BY_ID } from '../data/metroData'
import { costsFromMetro, totalCost } from './costs'
import {
  apportion,
  dotCounts,
  dotUnit,
  metroOutcomes,
  paycheckFrom,
  wealthFor,
} from './paycheck'
import { computeTakeHome } from './tax'

const austin = METROS_BY_ID['austin-tx']

function takeHomeIn(gross: number, metroId = 'austin-tx') {
  const metro = METROS_BY_ID[metroId]
  return computeTakeHome({
    gross,
    filingStatus: 'single',
    stateCode: metro.stateCode,
    localIncomeTaxRate: metro.localIncomeTaxRate,
    localIncomeTaxThreshold: metro.localIncomeTaxThreshold,
  })
}

describe('paycheckFrom', () => {
  it('splits monthly gross into groups that add back up to it', () => {
    const costs = costsFromMetro(austin, 'one_bed')
    const pay = paycheckFrom(takeHomeIn(100_000), costs)
    const sum = pay.groups.reduce((s, g) => s + g.amount, 0)
    expect(pay.gross).toBeCloseTo(100_000 / 12)
    expect(sum).toBeCloseTo(pay.gross)
    expect(pay.shortfall).toBe(0)
    expect(pay.groups.map((g) => g.key)).toEqual(['tax', 'housing', 'living', 'kept'])
    expect(pay.groups[1].amount).toBe(costs.housing)
    expect(pay.groups[2].amount).toBe(totalCost(costs) - costs.housing)
  })

  it('reports a shortfall rather than negative savings', () => {
    const costs = costsFromMetro(METROS_BY_ID['san-francisco-ca'], 'two_bed_solo')
    const pay = paycheckFrom(takeHomeIn(30_000), costs)
    expect(pay.groups[3].amount).toBe(0)
    expect(pay.shortfall).toBeCloseTo(totalCost(costs) - pay.net)
  })
})

describe('dot helpers', () => {
  it('picks the smallest round unit that fits', () => {
    expect(dotUnit(8_333, 1_400)).toBe(10)
    expect(dotUnit(1_667, 1_400)).toBe(2)
    expect(dotUnit(41_667, 1_400)).toBe(50)
  })

  it('apportions without losing a unit to rounding', () => {
    const parts = apportion(100, [1, 1, 1])
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100)
    expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1)
    expect(apportion(10, [0, 0])).toEqual([0, 0])
  })

  it('counts dots that sum to gross, with parts that sum to groups', () => {
    const pay = paycheckFrom(takeHomeIn(100_000), costsFromMetro(austin, 'one_bed'))
    const dots = dotCounts(pay, 1_400)
    const total = dots.groups.reduce((s, g) => s + g.count, 0)
    expect(total).toBe(Math.round(pay.gross / dots.unit))
    for (const g of dots.groups) {
      expect(g.parts.reduce((a, b) => a + b, 0)).toBe(g.count)
    }
  })
})

describe('dotCounts in a deficit', () => {
  it('keeps gross plus shortfall inside the dot budget', () => {
    const costs = costsFromMetro(METROS_BY_ID['san-francisco-ca'], 'two_bed_solo')
    const pay = paycheckFrom(takeHomeIn(30_000, 'san-francisco-ca'), costs)
    const dots = dotCounts(pay, 1_400)
    const gross = dots.groups.reduce((s, g) => s + g.count, 0)
    expect(pay.shortfall).toBeGreaterThan(0)
    expect(dots.shortfall).toBeGreaterThan(0)
    expect(gross + dots.shortfall).toBeLessThanOrEqual(1_400 + 1)
  })
})

describe('metroOutcomes', () => {
  it('runs every metro and sorts by what is kept', () => {
    const rows = metroOutcomes(100_000, 'single', 'one_bed')
    expect(rows.length).toBe(Object.keys(METROS_BY_ID).length)
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].kept).toBeGreaterThanOrEqual(rows[i].kept)
    }
    const a = rows.find((r) => r.metro.id === 'austin-tx')!
    expect(a.kept).toBeCloseTo(a.net - totalCost(costsFromMetro(austin, 'one_bed')))
  })
})

describe('wealthFor', () => {
  it('projects the requested horizon with no milestones', () => {
    const result = wealthFor('austin-tx', {
      gross: 100_000,
      filingStatus: 'single',
      tier: 'one_bed',
      wageGrowth: 0.035,
      inflationRate: 0.025,
      annualReturn: 0.07,
      startingBalance: 0,
      years: 20,
    })
    expect(result.years).toHaveLength(21)
    expect(result.years[20].realBalance).toBeGreaterThan(0)
  })
})

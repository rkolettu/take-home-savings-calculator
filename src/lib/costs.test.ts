import { describe, expect, it } from 'vitest'
import sourcedCosts from '../data/sourcedCosts.json'
import { METROS, METROS_BY_ID } from '../data/metros'
import {
  COST_DATA_VERSION,
  costsFromMetro,
  electricityEscalator,
  legacyCostsFromMetro,
} from './costs'

describe('electricity price escalator', () => {
  const base = {
    billPeriod: '2024',
    priceInflationBasePeriod: '2024',
    priceInflationMultiplier: 1.114969,
  }

  it('applies the escalator to the bill period it was derived for', () => {
    expect(electricityEscalator(base)).toBe(1.114969)
  })

  it('drops the escalator once a newer workbook lands', () => {
    // The refreshed bills already carry the newer prices; reapplying the old
    // escalator on top would inflate them a second time.
    expect(electricityEscalator({ ...base, billPeriod: '2025' })).toBe(1)
  })

  it.each([
    ['no recorded base period', { billPeriod: '2024', priceInflationMultiplier: 1.114969 }],
    ['no bill period', { priceInflationBasePeriod: '2024', priceInflationMultiplier: 1.114969 }],
    ['no multiplier', { billPeriod: '2024', priceInflationBasePeriod: '2024' }],
    ['nothing at all', {}],
  ])('falls back to 1 with %s', (_label, electricity) => {
    expect(electricityEscalator(electricity)).toBe(1)
  })

  it('rejects an out-of-band multiplier even on a matching period', () => {
    expect(electricityEscalator({ ...base, priceInflationMultiplier: 3 })).toBe(1)
    expect(electricityEscalator({ ...base, priceInflationMultiplier: 0.1 })).toBe(1)
  })

  it('keeps the shipped data self-consistent', () => {
    const { electricity } = sourcedCosts
    expect(electricity.priceInflationBasePeriod).toBe(electricity.billPeriod)
    expect(electricityEscalator(electricity)).toBe(electricity.priceInflationMultiplier)
  })
})

describe('sourced utilities', () => {
  it('covers every metro state with an EIA bill', () => {
    const bills = sourcedCosts.electricity.stateAverageMonthlyBill as Record<string, number>
    for (const metro of METROS) {
      expect(bills[metro.stateCode], metro.id).toBeTypeOf('number')
    }
  })

  it('stays inside the half-to-double guard rails for every metro', () => {
    for (const metro of METROS) {
      const { utilities } = costsFromMetro(metro)
      expect(utilities, metro.id).toBeGreaterThanOrEqual(Math.round(metro.utilities * 0.5))
      expect(utilities, metro.id).toBeLessThanOrEqual(Math.round(metro.utilities * 2))
    }
  })

  it('tracks the state electricity anchor across cheap and expensive states', () => {
    // Connecticut has the highest bill in the shipped table and Colorado one of
    // the lowest, so the sourced line must move in opposite directions there.
    const hartford = METROS_BY_ID['hartford-ct']
    const denver = METROS_BY_ID['denver-co']
    expect(costsFromMetro(hartford).utilities).toBeGreaterThan(hartford.utilities)
    expect(costsFromMetro(denver).utilities).toBeLessThan(denver.utilities)
  })
})

describe('unsourced category layer', () => {
  it('leaves groceries, transport and discretionary on the metro benchmark', () => {
    // These multipliers have no generator behind them, so they must stay off
    // even while the housing and utility layers are live.
    for (const metro of METROS) {
      const costs = costsFromMetro(metro)
      const legacy = legacyCostsFromMetro(metro)
      expect(costs.groceries, metro.id).toBe(legacy.groceries)
      expect(costs.transport, metro.id).toBe(legacy.transport)
      expect(costs.discretionary, metro.id).toBe(legacy.discretionary)
    }
  })
})

describe('cost data version', () => {
  it('names every layer that is actually applied', () => {
    expect(COST_DATA_VERSION).toContain('hud-')
    expect(COST_DATA_VERSION).toContain(`eia-${sourcedCosts.electricity.billPeriod}`)
  })
})

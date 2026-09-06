import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RETURNS,
  PRESETS,
  blendedReturn,
  matchingPreset,
  normalisedWeights,
} from './vehicles'

describe('normalisedWeights', () => {
  it('normalises raw weights to shares summing to 1', () => {
    const shares = normalisedWeights({ cash: 25, fixed: 25, index: 50 })
    expect(shares.cash).toBeCloseTo(0.25, 6)
    expect(shares.index).toBeCloseTo(0.5, 6)
    expect(shares.cash + shares.fixed + shares.index).toBeCloseTo(1, 6)
  })

  it('normalises weights that do not already total 100', () => {
    const shares = normalisedWeights({ cash: 1, fixed: 1, index: 2 })
    expect(shares.index).toBeCloseTo(0.5, 6)
  })

  it('returns zeros rather than NaN when every weight is zero', () => {
    expect(normalisedWeights({ cash: 0, fixed: 0, index: 0 })).toEqual({
      cash: 0,
      fixed: 0,
      index: 0,
    })
  })

  it('ignores negative weights', () => {
    const shares = normalisedWeights({ cash: -50, fixed: 0, index: 100 })
    expect(shares.index).toBeCloseTo(1, 6)
    expect(shares.cash).toBe(0)
  })
})

describe('blendedReturn', () => {
  it('returns the vehicle rate for a 100% allocation', () => {
    expect(blendedReturn(PRESETS.index, DEFAULT_RETURNS)).toBeCloseTo(0.085, 6)
    expect(blendedReturn(PRESETS.cash, DEFAULT_RETURNS)).toBeCloseTo(0.04, 6)
  })

  it('weights a blend correctly', () => {
    // 10% x 4.0% + 30% x 4.5% + 60% x 8.5% = 6.85%
    expect(blendedReturn(PRESETS.balanced, DEFAULT_RETURNS)).toBeCloseTo(
      0.0685,
      6,
    )
  })

  it('honours edited vehicle returns', () => {
    expect(
      blendedReturn(PRESETS.index, { ...DEFAULT_RETURNS, index: 0.1 }),
    ).toBeCloseTo(0.1, 6)
  })

  it('is 0 when nothing is allocated', () => {
    expect(
      blendedReturn({ cash: 0, fixed: 0, index: 0 }, DEFAULT_RETURNS),
    ).toBe(0)
  })

  it('lands between the lowest and highest vehicle for any blend', () => {
    const blend = blendedReturn({ cash: 33, fixed: 33, index: 34 }, DEFAULT_RETURNS)
    expect(blend).toBeGreaterThan(0.04)
    expect(blend).toBeLessThan(0.085)
  })
})

describe('matchingPreset', () => {
  it('identifies a preset regardless of raw scale', () => {
    expect(matchingPreset({ cash: 0, fixed: 0, index: 100 })).toBe('index')
    expect(matchingPreset({ cash: 0, fixed: 0, index: 7 })).toBe('index')
  })

  it('returns null for an allocation that matches nothing', () => {
    expect(matchingPreset({ cash: 40, fixed: 20, index: 40 })).toBeNull()
  })
})

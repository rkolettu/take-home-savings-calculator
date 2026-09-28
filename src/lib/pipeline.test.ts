import { describe, expect, it } from 'vitest'
import { pipelineFlow } from './pipeline'

describe('pipelineFlow', () => {
  it('splits gross into shares that sum to one', () => {
    const flow = pipelineFlow(100_000, 25_000, 45_000)
    expect(flow.tax).toBeCloseTo(0.25)
    expect(flow.cost).toBeCloseTo(0.45)
    expect(flow.save).toBeCloseTo(0.3)
    expect(flow.tax + flow.cost + flow.save).toBeCloseTo(1)
    expect(flow.annualSavings).toBe(30_000)
    expect(flow.deficit).toBe(false)
  })

  it('caps costs at take-home and empties savings in a deficit', () => {
    const flow = pipelineFlow(50_000, 10_000, 60_000)
    expect(flow.cost).toBeCloseTo(0.8)
    expect(flow.save).toBe(0)
    expect(flow.annualSavings).toBe(0)
    expect(flow.deficit).toBe(true)
  })

  it('returns an empty flow for zero income', () => {
    expect(pipelineFlow(0, 0, 30_000)).toEqual({
      tax: 0,
      cost: 0,
      save: 0,
      annualSavings: 0,
      deficit: false,
    })
  })
})

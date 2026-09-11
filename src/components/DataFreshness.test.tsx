import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// Render the actual footer against enabled/disabled and inert/active HUD snapshots.
afterEach(() => {
  vi.resetModules()
  vi.doUnmock('../data/costDataConfig')
  vi.doUnmock('../data/sourcedCosts.json')
  vi.doUnmock('../data/liveData.json')
})

describe('cost provenance labels', () => {
  it.each([
    [false, 1.1, false],
    [true, 1, false],
    [true, 1.1, true],
    [true, 1.000003, false],
    [true, 1.5, false],
  ])('gates sourced labels with flag=%s multiplier=%s', async (enabled, multiplier, sourced) => {
    vi.doMock('../data/costDataConfig', () => ({ USE_AUTOMATIC_HOUSING_UPDATES: enabled }))
    vi.doMock('../data/sourcedCosts.json', () => ({ default: {
      housingMultipliers: { 'new-york-ny': multiplier },
      housingPeriod: 'FY2027',
      categoryMultipliers: { groceries: 1, utilities: 1, transport: 1, discretionary: 1 },
    } }))
    vi.doMock('../data/liveData.json', () => ({ default: {
      taxes: '2026 rules', rentEstimates: 'HUD FMR-indexed · FY2028',
      rentSource: 'Zumper Aug 2026 anchor, HUD Fair Market Rent 1BR drift',
      costModel: 'Anchored benchmarks, FMR-indexed', costIndexPeriod: 'FY2028',
      inflationRate: 0.034, inflationPeriod: 'July 2026', dataUpdated: 'September 2026',
    } }))
    const { DataFreshness } = await import('./DataFreshness')
    const html = renderToStaticMarkup(<DataFreshness />)
    expect(html.includes('HUD FMR-indexed')).toBe(sourced)
    expect(html.includes('Anchored benchmarks, FMR-indexed')).toBe(sourced)
    expect(html.includes('Aug 2026 asking-rent benchmarks')).toBe(!sourced)
    expect(html).toContain('HUD FMR annual indexing enabled')
    expect(html).toContain('2026 rules')
    expect(html).toContain('3.4% CPI-U')
    expect(html).toContain('Data snapshot: September 2026')
  })
})

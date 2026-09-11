import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// Render the actual footer against enabled/disabled and inert/active snapshots.
afterEach(() => {
  vi.resetModules()
  vi.doUnmock('../data/costDataConfig')
  vi.doUnmock('../data/sourcedCosts.json')
  vi.doUnmock('../data/liveData.json')
})

interface FooterOptions {
  housingEnabled?: boolean
  utilitiesEnabled?: boolean
  multiplier?: number
  electricity?: unknown
}

async function renderFooter({
  housingEnabled = true,
  utilitiesEnabled = false,
  multiplier = 1,
  electricity = { billPeriod: '2024', stateAverageMonthlyBill: { NY: 139.53 } },
}: FooterOptions = {}): Promise<string> {
  // The footer reads its flags once at module scope, so each render needs a
  // fresh module graph rather than the one cached by an earlier render.
  vi.resetModules()
  vi.doMock('../data/costDataConfig', () => ({
    USE_AUTOMATIC_HOUSING_UPDATES: housingEnabled,
    USE_AUTOMATIC_UTILITY_UPDATES: utilitiesEnabled,
  }))
  vi.doMock('../data/sourcedCosts.json', () => ({ default: {
    housingMultipliers: { 'new-york-ny': multiplier },
    housingPeriod: 'FY2027',
    categoryMultipliers: { groceries: 1, utilities: 1, transport: 1, discretionary: 1 },
    electricity,
  } }))
  vi.doMock('../data/liveData.json', () => ({ default: {
    taxes: '2026 rules', rentEstimates: 'HUD FMR-indexed · FY2028',
    rentSource: 'Zumper Aug 2026 anchor, HUD Fair Market Rent 1BR drift',
    costModel: 'Anchored benchmarks, FMR-indexed', costIndexPeriod: 'FY2028',
    inflationRate: 0.034, inflationPeriod: 'July 2026', dataUpdated: 'September 2026',
  } }))
  const { DataFreshness } = await import('./DataFreshness')
  return renderToStaticMarkup(<DataFreshness />)
}

describe('cost provenance labels', () => {
  it.each([
    [false, 1.1, false],
    [true, 1, false],
    [true, 1.1, true],
    [true, 1.000003, false],
    [true, 1.5, false],
  ])('gates sourced labels with flag=%s multiplier=%s', async (housingEnabled, multiplier, sourced) => {
    const html = await renderFooter({ housingEnabled, multiplier })
    expect(html.includes('HUD FMR-indexed')).toBe(sourced)
    expect(html.includes('Zumper Aug 2026 anchor')).toBe(sourced)
    expect(html.includes('Aug 2026 median asking rents')).toBe(!sourced)
    expect(html.includes('Re-indexed yearly to HUD fair-market rents')).toBe(!sourced)
    expect(html).toContain('2026 rules')
    expect(html).toContain('3.4% CPI-U')
    expect(html).toContain('Data snapshot: September 2026')
  })

  it('states each tile once for assistive tech and copied text', async () => {
    // Every tile repeats itself inside a hover tooltip so truncated text stays
    // readable. That duplicate must not reach a screen reader or a page copy.
    const html = await renderFooter()
    const tooltips = html.match(/aria-hidden="true"/g) ?? []
    expect(tooltips.length).toBeGreaterThanOrEqual(4)
    expect(html).not.toContain('role="tooltip"')
  })
})

describe('utility provenance labels', () => {
  it('claims an EIA anchor only when the flag is on', async () => {
    const enabled = await renderFooter({ utilitiesEnabled: true })
    expect(enabled).toContain('EIA state electricity averages')
    expect(enabled).toContain('Energy Information Administration')
    expect(enabled).toContain('2024 bills, scaled to one renter')

    const disabled = await renderFooter({ utilitiesEnabled: false })
    expect(disabled).not.toContain('EIA state electricity averages')
    expect(disabled).not.toContain('Energy Information Administration')
    expect(disabled).toContain('Per-metro estimates')
  })

  it.each([
    ['missing', null],
    ['empty', { billPeriod: '2024', stateAverageMonthlyBill: {} }],
    ['billless', { billPeriod: '2024' }],
  ])('stays silent when the electricity block is %s', async (_label, electricity) => {
    // The flag alone must never produce a sourcing claim the data cannot back.
    const html = await renderFooter({ utilitiesEnabled: true, electricity })
    expect(html).not.toContain('EIA state electricity averages')
    expect(html).not.toContain('Energy Information Administration')
  })
})

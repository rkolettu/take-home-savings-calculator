import { describe, expect, it, vi } from 'vitest'
import {
  buildHudUpdate,
  fetchHudYear,
  HUD_METROS,
  parseHudOneBedroom,
  verifyHudMetroMapping,
} from './refresh-live-data.mjs'
import { METROS } from '../src/data/metros'

const OBJECT_RESPONSE = {
  data: {
    county_name: '',
    counties_msa: 'Example County',
    town_name: '',
    metro_status: '1',
    metro_name: 'Example Metro',
    area_name: 'Example Metro HUD Metro FMR Area',
    smallarea_status: '0',
    year: '2027',
    basicdata: {
      Efficiency: '1000.0',
      'One-Bedroom': '1200.0',
      'Two-Bedroom': '1400.0',
      'Three-Bedroom': '1700.0',
      'Four-Bedroom': '2000.0',
      year: '2027',
    },
  },
}

describe('HUD FMR parsing', () => {
  it('reads one-bedroom rent from both regular and small-area responses', () => {
    expect(parseHudOneBedroom(OBJECT_RESPONSE, 'regular')).toBe(1200)
    expect(parseHudOneBedroom({
      data: {
        ...OBJECT_RESPONSE.data,
        smallarea_status: '1',
        basicdata: [
          {
            zip_code: 'MSA level',
            Efficiency: 1100,
            'One-Bedroom': 1300,
            'Two-Bedroom': 1500,
            'Three-Bedroom': 1800,
            'Four-Bedroom': 2100,
          },
          {
            zip_code: '20001',
            Efficiency: 1500,
            'One-Bedroom': 1700,
            'Two-Bedroom': 1900,
            'Three-Bedroom': 2200,
            'Four-Bedroom': 2500,
          },
        ],
      },
    }, 'small area')).toBe(1300)
  })

  it('rejects a missing or invalid one-bedroom value', () => {
    expect(() => parseHudOneBedroom({ data: { basicdata: {} } }, 'broken metro'))
      .toThrow('broken metro has no valid HUD One-Bedroom FMR')
  })
})

describe('HUD FMR requests', () => {
  it('maps every calculator metro exactly once', () => {
    expect(Object.keys(HUD_METROS).sort()).toEqual(METROS.map((metro) => metro.id).sort())
  })

  it('validates the committed codes against listMetroAreas in one request', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: [
        { cbsa_code: 'METRO10000M10000', area_name: 'Alpha MSA', category: 'MetroArea' },
        { cbsa_code: 'METRO20000M20000', area_name: 'Beta MSA', category: 'MetroArea' },
      ] }),
    }))

    await expect(verifyHudMetroMapping({
      token: 'test-token',
      metros: { alpha: 'METRO10000M10000', beta: 'METRO20000M20000' },
      fetchImpl,
    })).resolves.toBe(2)
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(fetchImpl.mock.calls[0][0]).toBe(
      'https://www.huduser.gov/hudapi/public/fmr/listMetroAreas',
    )
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token')
  })

  it('requires a token before making a request', async () => {
    const fetchImpl = vi.fn()
    await expect(fetchHudYear({
      year: 2027,
      token: '',
      metros: { alpha: 'METRO10000M10000' },
      fetchImpl,
    })).rejects.toThrow('HUD_API_TOKEN is required')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('uses the documented endpoint and Bearer header while staying below 60 requests per minute', async () => {
    let now = 0
    const starts = []
    const requests = []
    const fetchImpl = vi.fn(async (url, options) => {
      starts.push(now)
      requests.push({ url, options })
      return {
        ok: true,
        status: 200,
        json: async () => OBJECT_RESPONSE,
      }
    })

    const result = await fetchHudYear({
      year: 2027,
      token: 'test-token',
      metros: {
        alpha: 'METRO10000M10000',
        beta: 'METRO20000M20000',
        gamma: 'METRO30000M30000',
      },
      fetchImpl,
      now: () => now,
      sleep: async (milliseconds) => { now += milliseconds },
    })

    expect(result).toEqual({ alpha: 1200, beta: 1200, gamma: 1200 })
    expect(requests.map(({ url }) => url)).toEqual([
      'https://www.huduser.gov/hudapi/public/fmr/data/METRO10000M10000?year=2027',
      'https://www.huduser.gov/hudapi/public/fmr/data/METRO20000M20000?year=2027',
      'https://www.huduser.gov/hudapi/public/fmr/data/METRO30000M30000?year=2027',
    ])
    expect(requests.every(({ options }) =>
      options.headers.Authorization === 'Bearer test-token')).toBe(true)
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(1000)
    expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(1000)
  })

  it('reports every failed metro and rejects partial coverage', async () => {
    const fetchImpl = vi.fn(async (url) => ({
      ok: !url.includes('BAD'),
      status: url.includes('BAD') ? 404 : 200,
      json: async () => OBJECT_RESPONSE,
    }))

    await expect(fetchHudYear({
      year: 2027,
      token: 'test-token',
      metros: {
        alpha: 'METRO10000M10000',
        beta: 'BAD',
        gamma: 'BAD-TOO',
      },
      fetchImpl,
      now: () => 0,
      sleep: async () => {},
    })).rejects.toThrow('HUD FY2027 coverage 1/3; failed: beta, gamma')
  })
})

describe('HUD housing update', () => {
  const existingCosts = {
    dataVersion: 'old',
    categoryMultipliers: { utilities: 1.1, groceries: 0.9, transport: 1.2, discretionary: 0.8 },
    categoryPeriods: { utilities: 'old', groceries: 'old', transport: 'old', discretionary: 'old' },
    housingMultipliers: { alpha: 1, beta: 1 },
    housingBaseValues: { alpha: 999, beta: 999 },
    housingLatestValues: { alpha: 999, beta: 999 },
    electricity: { billPeriod: '2024', stateAverageMonthlyBill: { TX: 100 } },
    sources: { housing: 'old housing', groceries: 'old groceries' },
  }
  const existingLive = {
    rentEstimates: 'Market benchmark estimates · Aug 2026',
    rentSource: 'Median 1BR asking rents, single-source benchmark',
    costModel: 'Benchmark estimates, inflation-indexed',
  }

  it('derives bounded drift while leaving CPI and EIA data untouched', () => {
    const { nextCosts, nextLive, hasHousingDrift } = buildHudUpdate({
      existingCosts,
      existingLive,
      metros: { alpha: 'A', beta: 'B' },
      anchorYear: 2027,
      currentYear: 2028,
      anchorRents: { alpha: 1000, beta: 2000 },
      currentRents: { alpha: 1100, beta: 1900 },
    })

    expect(nextCosts.housingMultipliers).toEqual({ alpha: 1.1, beta: 0.95 })
    expect(nextCosts.housingBaseValues).toEqual({ alpha: 1000, beta: 2000 })
    expect(nextCosts.housingLatestValues).toEqual({ alpha: 1100, beta: 1900 })
    expect(nextCosts.housingAnchorYear).toBe(2027)
    expect(nextCosts.housingCoverage).toBe(2)
    expect(nextCosts.categoryMultipliers).toEqual(existingCosts.categoryMultipliers)
    expect(nextCosts.categoryPeriods).toEqual(existingCosts.categoryPeriods)
    expect(nextCosts.electricity).toEqual(existingCosts.electricity)
    expect(nextLive.rentEstimates).toBe('HUD FMR-indexed · FY2028')
    expect(nextLive.rentSource).toBe('Zumper Aug 2026 anchor, HUD Fair Market Rent 1BR drift')
    expect(nextLive.costModel).toBe('Anchored benchmarks, FMR-indexed')
    expect(hasHousingDrift).toBe(true)
  })

  it('keeps benchmark provenance when the anchor is still the latest HUD year', () => {
    const { nextLive, hasHousingDrift } = buildHudUpdate({
      existingCosts,
      existingLive,
      metros: { alpha: 'A', beta: 'B' },
      anchorYear: 2027,
      currentYear: 2027,
      anchorRents: { alpha: 1000, beta: 2000 },
      currentRents: { alpha: 1000, beta: 2000 },
    })

    expect(nextLive).toMatchObject(existingLive)
    expect(hasHousingDrift).toBe(false)
  })

  it('rejects missing metros and out-of-bounds annual drift instead of clamping', () => {
    expect(() => buildHudUpdate({
      existingCosts,
      existingLive,
      metros: { alpha: 'A', beta: 'B' },
      anchorYear: 2027,
      currentYear: 2028,
      anchorRents: { alpha: 1000, beta: 2000 },
      currentRents: { alpha: 1100 },
    })).toThrow('HUD rent coverage incomplete: beta')

    expect(() => buildHudUpdate({
      existingCosts,
      existingLive,
      metros: { alpha: 'A' },
      anchorYear: 2027,
      currentYear: 2028,
      anchorRents: { alpha: 1000 },
      currentRents: { alpha: 1300 },
    })).toThrow('alpha HUD FMR multiplier 1.3 failed validation')
  })
})

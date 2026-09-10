import { beforeEach, describe, expect, it } from 'vitest'
import { costsFromMetro } from './costs'
import { METROS_BY_ID } from '../data/metroData'
import type { PersistedState } from './persistence'
import { clearState, loadState, saveState } from './persistence'
import { DEFAULT_RETURNS, PRESETS } from './vehicles'

/** Minimal in-memory Storage, so these tests need no DOM environment. */
function fakeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  }
}

function validState(): PersistedState {
  return {
    metroId: 'austin-tx',
    gross: 150_000,
    filingStatus: 'single',
    costs: costsFromMetro(METROS_BY_ID['austin-tx'], 'roommate'),
    housingTier: 'roommate',
    wageGrowth: 0.035,
    inflationRate: 0.025,
    horizonYears: 20,
    startingBalance: 1_000,
    weights: { ...PRESETS.index },
    returns: { ...DEFAULT_RETURNS },
    milestones: [
      { id: 'a', year: 5, kind: 'salary', grossSalary: 200_000 },
      { id: 'b', year: 8, kind: 'relocate', metroId: 'new-york-ny' },
      { id: 'c', year: 3, kind: 'housing', housing: 3_000 },
      { id: 'd', year: 4, kind: 'expense', delta: -400, label: 'Debt paid' },
      { id: 'e', year: 6, kind: 'housingTier', tier: 'two_bed_solo' },
    ],
    realMode: true,
  }
}

let storage: Storage

beforeEach(() => {
  storage = fakeStorage()
})

describe('round trip', () => {
  it('restores every field it saved', () => {
    const state = validState()
    saveState(state, storage)
    expect(loadState(storage)).toEqual(state)
  })

  it('returns nothing before anything is saved', () => {
    expect(loadState(storage)).toEqual({})
  })

  it('forgets state after clearState', () => {
    saveState(validState(), storage)
    clearState(storage)
    expect(loadState(storage)).toEqual({})
  })
})

describe('tolerating a missing or hostile store', () => {
  it('loads and saves without a Storage at all', () => {
    expect(loadState(null)).toEqual({})
    expect(() => saveState(validState(), null)).not.toThrow()
    expect(() => clearState(null)).not.toThrow()
  })

  it('survives a store that throws on write', () => {
    const hostile = {
      ...fakeStorage(),
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    } as Storage
    expect(() => saveState(validState(), hostile)).not.toThrow()
  })

  it('survives a store that throws on read', () => {
    const hostile = {
      ...fakeStorage(),
      getItem: () => {
        throw new Error('SecurityError')
      },
    } as Storage
    expect(loadState(hostile)).toEqual({})
  })
})

describe('sanitising corrupt entries', () => {
  function write(raw: string) {
    storage.setItem('take-home-calculator:v1', raw)
  }

  it('ignores malformed JSON', () => {
    write('{not json')
    expect(loadState(storage)).toEqual({})
  })

  it('ignores a non-object payload', () => {
    write('"a string"')
    expect(loadState(storage)).toEqual({})
  })

  it('drops an unknown metro id', () => {
    write(JSON.stringify({ metroId: 'atlantis-zz', gross: 120_000 }))
    const loaded = loadState(storage)
    expect(loaded.metroId).toBeUndefined()
    expect(loaded.gross).toBe(120_000)
  })

  it('drops a filing status that is not a real one', () => {
    write(JSON.stringify({ filingStatus: 'sole-trader' }))
    expect(loadState(storage).filingStatus).toBeUndefined()
  })

  it('clamps out-of-range numbers instead of dropping them', () => {
    write(JSON.stringify({ horizonYears: 999, wageGrowth: -5, gross: 1e12 }))
    const loaded = loadState(storage)
    expect(loaded.horizonYears).toBe(30)
    expect(loaded.wageGrowth).toBe(0)
    expect(loaded.gross).toBe(100_000_000)
  })

  it('rejects NaN and non-numeric values', () => {
    write(JSON.stringify({ gross: 'lots', startingBalance: null }))
    const loaded = loadState(storage)
    expect(loaded.gross).toBeUndefined()
    expect(loaded.startingBalance).toBeUndefined()
  })

  it('falls back to the roommate tier when housingTier is invalid', () => {
    write(JSON.stringify({ housingTier: 'penthouse' }))
    expect(loadState(storage).housingTier).toBeUndefined()
  })

  it('accepts every valid housing tier', () => {
    for (const tier of ['roommate', 'studio', 'one_bed', 'two_bed_solo']) {
      write(JSON.stringify({ housingTier: tier }))
      expect(loadState(storage).housingTier).toBe(tier)
    }
  })

  it('drops a housingTier milestone naming an unknown tier', () => {
    write(
      JSON.stringify({
        milestones: [
          { id: 'ok', year: 2, kind: 'housingTier', tier: 'studio' },
          { id: 'bad', year: 3, kind: 'housingTier', tier: 'castle' },
        ],
      }),
    )
    expect(loadState(storage).milestones?.map((m) => m.id)).toEqual(['ok'])
  })

  it('reads a pre-tier budget that still uses the housing1BR key', () => {
    write(
      JSON.stringify({
        metroId: 'austin-tx',
        housingTier: 'one_bed',
        _costsEdited: true,
        costs: {
          housing1BR: 1_260,
          utilities: 165,
          groceries: 480,
          transport: 185,
          discretionary: 600,
        },
      }),
    )
    expect(loadState(storage).costs).toEqual({
      housing: 1_260,
      utilities: 165,
      groceries: 480,
      transport: 185,
      discretionary: 600,
    })
  })

  it('drops a partial cost basket rather than half-applying it', () => {
    write(JSON.stringify({ costs: { housing: 2_000 } }))
    expect(loadState(storage).costs).toBeUndefined()
  })

  it('keeps valid milestones and drops only the broken ones', () => {
    write(
      JSON.stringify({
        milestones: [
          { id: 'ok', year: 5, kind: 'salary', grossSalary: 200_000 },
          { id: 'bad-kind', year: 5, kind: 'lottery', amount: 1 },
          { id: 'bad-metro', year: 6, kind: 'relocate', metroId: 'nowhere' },
          { id: 'no-year', kind: 'housing', housing: 3_000 },
          'not an object',
          { id: 'ok2', year: 9, kind: 'expense', delta: 500, label: 'Child' },
        ],
      }),
    )
    const milestones = loadState(storage).milestones
    expect(milestones?.map((m) => m.id)).toEqual(['ok', 'ok2'])
  })

  it('caps a runaway milestone list', () => {
    write(
      JSON.stringify({
        milestones: Array.from({ length: 200 }, (_, i) => ({
          id: `m${i}`,
          year: 1,
          kind: 'salary',
          grossSalary: 100_000,
        })),
      }),
    )
    expect(loadState(storage).milestones).toHaveLength(50)
  })

  it('drops an allocation missing a vehicle', () => {
    write(JSON.stringify({ weights: { cash: 50, index: 50 } }))
    expect(loadState(storage).weights).toBeUndefined()
  })

  it('truncates an over-long expense label', () => {
    write(
      JSON.stringify({
        milestones: [
          {
            id: 'x',
            year: 2,
            kind: 'expense',
            delta: 100,
            label: 'z'.repeat(500),
          },
        ],
      }),
    )
    const milestone = loadState(storage).milestones?.[0]
    expect(milestone?.kind === 'expense' && milestone.label.length).toBe(80)
  })
})

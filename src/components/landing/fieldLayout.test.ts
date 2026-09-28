import { describe, expect, it } from 'vitest'
import type { FieldGeometry, FieldGroupSpec } from './fieldLayout'
import { layoutField } from './fieldLayout'

const geo: FieldGeometry = {
  width: 600,
  height: 300,
  rows: 10,
  maxSpacing: 10,
  referenceCols: 50,
  gapCols: 2,
  bottomPad: 0,
}

const groups = (detached: boolean[]): FieldGroupSpec[] => [
  { key: 'a', count: 25, parts: [10, 15], detached: detached[0] },
  { key: 'b', count: 30, parts: [30], detached: detached[1] },
  { key: 'c', count: 5, parts: [5], detached: detached[2] },
]

describe('layoutField', () => {
  it('places one dot per unit, tagged with its group and part', () => {
    const { dots } = layoutField(groups([true, true, true]), geo)
    expect(dots).toHaveLength(60)
    expect(dots.filter((d) => d.group === 0 && d.part === 1)).toHaveLength(15)
  })

  it('fuses attached groups into one solid block', () => {
    const { blocks } = layoutField(groups([false, false, false]), geo)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].keys).toEqual(['a', 'b', 'c'])
    expect(blocks[0].x1 - blocks[0].x0).toBe(6 * 10)
  })

  it('separates detached groups with a gap, widths proportional to count', () => {
    const { blocks, spacing } = layoutField(groups([true, true, true]), geo)
    expect(blocks).toHaveLength(3)
    expect(blocks[1].x0 - blocks[0].x1).toBe(2 * spacing)
    expect(blocks[1].x1 - blocks[1].x0).toBe(3 * spacing)
  })

  it('offsets a detached block vertically by its dy', () => {
    const specs = groups([true, true, true])
    specs[2].dy = -20
    const { blocks } = layoutField(specs, geo)
    expect(blocks[2].bottom).toBe(blocks[0].bottom - 20)
  })

  it('shrinks spacing only when the paycheck cannot fit', () => {
    const wide = layoutField(
      [{ key: 'a', count: 2_000, parts: [2_000], detached: true }],
      geo,
    )
    expect(wide.spacing).toBeLessThan(geo.width / geo.referenceCols)
    expect(wide.blocks[0].x1).toBeLessThanOrEqual(geo.width + 1e-6)
  })
})

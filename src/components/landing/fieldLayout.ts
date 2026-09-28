/**
 * Pure geometry for the paycheck sculpture: a bar chart built out of dots.
 *
 * Every group is laid out as columns of `rows` dots, filled bottom-up and
 * left to right, so a group's width is proportional to its dollars. Groups
 * that have "detached" stand apart with a gap; consecutive attached groups
 * fuse into one solid mass, which is how the whole paycheck reads before
 * anything is taken out of it.
 */
export interface FieldGroupSpec {
  key: string
  count: number
  /** Dots per part within the group, in order. Sums to `count`. */
  parts: number[]
  detached: boolean
  /** Vertical offset in px for this group's block when detached (negative is up). */
  dy?: number
}

export interface DotTarget {
  x: number
  y: number
  group: number
  part: number
}

export interface BlockBox {
  /** Keys of the groups fused into this block. */
  keys: string[]
  x0: number
  x1: number
  top: number
  bottom: number
}

export interface FieldLayout {
  dots: DotTarget[]
  blocks: BlockBox[]
  spacing: number
}

export interface FieldGeometry {
  width: number
  height: number
  rows: number
  /** Spacing ceiling in px. */
  maxSpacing: number
  /** Columns the widest expected paycheck needs; keeps dot size steady as pay changes. */
  referenceCols: number
  /** Gap between detached blocks, in dot spacings. */
  gapCols: number
  /** Empty space kept under the lowest row, in px. */
  bottomPad: number
}

export function layoutField(groups: FieldGroupSpec[], geo: FieldGeometry): FieldLayout {
  /* Fuse runs of attached groups into single blocks. */
  const blocks: { members: number[]; dy: number }[] = []
  groups.forEach((g, i) => {
    if (g.count <= 0) return
    const last = blocks[blocks.length - 1]
    const lastDetached = last ? groups[last.members[0]].detached : true
    if (!g.detached && last && !lastDetached) last.members.push(i)
    else blocks.push({ members: [i], dy: g.detached ? (g.dy ?? 0) : 0 })
  })

  const colsOf = (members: number[]) =>
    Math.ceil(members.reduce((s, i) => s + groups[i].count, 0) / geo.rows)
  const neededCols =
    blocks.reduce((s, b) => s + colsOf(b.members), 0) +
    Math.max(0, blocks.length - 1) * geo.gapCols

  /* Steady dot size across salaries, shrinking only if this paycheck
     genuinely can't fit (a large shortfall, say). */
  const spacing = Math.min(
    geo.maxSpacing,
    geo.width / Math.max(geo.referenceCols, 1),
    geo.width / Math.max(neededCols, 1),
  )

  const baseY = geo.height - geo.bottomPad
  const dots: DotTarget[] = []
  const boxes: BlockBox[] = []
  let cursor = 0

  for (const block of blocks) {
    let i = 0
    for (const gi of block.members) {
      groups[gi].parts.forEach((partCount, pi) => {
        for (let k = 0; k < partCount; k++, i++) {
          const col = Math.floor(i / geo.rows)
          const row = i % geo.rows
          dots.push({
            x: cursor + col * spacing + spacing / 2,
            y: baseY + block.dy - row * spacing - spacing / 2,
            group: gi,
            part: pi,
          })
        }
      })
    }
    const cols = Math.ceil(i / geo.rows)
    const fullRows = Math.min(i, geo.rows)
    boxes.push({
      keys: block.members.map((gi) => groups[gi].key),
      x0: cursor,
      x1: cursor + cols * spacing,
      top: baseY + block.dy - fullRows * spacing,
      bottom: baseY + block.dy,
    })
    cursor += cols * spacing + geo.gapCols * spacing
  }

  return { dots, blocks: boxes, spacing }
}

import { useInView, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { DotCounts, PaycheckGroupKey } from '../../lib/paycheck'
import { FieldEngine } from './fieldEngine'
import type { FieldGroupSpec } from './fieldLayout'
import { layoutField } from './fieldLayout'
import { GROUP_TONES, INK } from './landingTheme'

export type FieldKey = PaycheckGroupKey | 'shortfall'

interface PaycheckFieldProps {
  counts: DotCounts
  /** Which of tax, housing, living, kept have come away from the mass. */
  detached: Record<PaycheckGroupKey, boolean>
  /** Most dots a paycheck may use; fixes dot size across salaries. */
  maxDots: number
  rows: number
  height: number
  /** Gather from a scattered cloud the first time the field scrolls into view. */
  entrance?: boolean
  focus: FieldKey | null
  onFocus?: (key: FieldKey | null) => void
  labels: Record<FieldKey, string>
  /** Label for a block of groups still fused together. */
  mergedLabel: string
  /** Screen-reader summary; the canvas itself is decorative. */
  description: string
}

const CAPACITY = 2_600

/**
 * The paycheck as a physical thing: a bar chart made of dots, one dot per
 * fixed number of dollars. Groups come away from the mass as they are
 * spent, and what is kept stays blue.
 */
export function PaycheckField({
  counts,
  detached,
  maxDots,
  rows,
  height,
  entrance = false,
  focus,
  onFocus,
  labels,
  mergedLabel,
  description,
}: PaycheckFieldProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<FieldEngine | null>(null)
  const [width, setWidth] = useState(0)
  const reduce = useReducedMotion() ?? false
  const inView = useInView(wrapRef, { amount: 0.3 })
  const [entranceStage, setStage] = useState<'hidden' | 'gather' | 'ready'>(
    entrance ? 'hidden' : 'ready',
  )
  /* Reduced motion skips the entrance entirely. */
  const stage = reduce ? 'ready' : entranceStage

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      engineRef.current = new FieldEngine(canvas, CAPACITY)
    } catch {
      engineRef.current = null
    }
    return () => engineRef.current?.stop()
  }, [])

  useEffect(() => {
    if (engineRef.current) engineRef.current.reduced = reduce
  }, [reduce])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    engineRef.current?.resize(width, height, Math.min(window.devicePixelRatio || 1, 2))
  }, [width, height])

  /* Entrance: a scattered cloud gathers into one paycheck, then it splits. */
  useEffect(() => {
    if (stage !== 'hidden' || !inView || width === 0) return
    engineRef.current?.scatter(counts.groups.reduce((s, g) => s + g.count, 0))
    const t = window.setTimeout(() => setStage('gather'), 180)
    return () => window.clearTimeout(t)
  }, [stage, inView, width, counts])

  useEffect(() => {
    if (stage !== 'gather') return
    const t = window.setTimeout(() => setStage('ready'), 1_250)
    return () => window.clearTimeout(t)
  }, [stage])

  const specs = useMemo<FieldGroupSpec[]>(() => {
    const gathered = stage !== 'ready'
    const specs: FieldGroupSpec[] = counts.groups.map((g) => ({
      key: g.key,
      count: g.count,
      parts: g.parts,
      detached: !gathered && detached[g.key],
    }))
    if (counts.shortfall > 0 && !gathered) {
      specs.push({ key: 'shortfall', count: counts.shortfall, parts: [counts.shortfall], detached: true })
    }
    return specs
  }, [counts, detached, stage])

  const layout = useMemo(() => {
    if (width === 0) return null
    const gapCols = 2.4
    return layoutField(specs, {
      width,
      height,
      rows,
      maxSpacing: 13,
      referenceCols: Math.ceil(maxDots / rows) + 4 * gapCols,
      gapCols,
      bottomPad: 4,
    })
  }, [specs, width, height, rows, maxDots])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine || !layout || stage === 'hidden') return
    engine.setLayout(
      layout.dots,
      (group, part) => {
        const spec = specs[group]
        const key = spec.key as FieldKey
        if (!spec.detached) return { rgb: INK }
        const tones = GROUP_TONES[key].parts
        return { rgb: tones[Math.min(part, tones.length - 1)], hollow: key === 'shortfall' }
      },
      layout.spacing,
    )
  }, [layout, specs, stage])

  useEffect(() => {
    const idx = focus ? specs.findIndex((s) => s.key === focus && s.detached) : -1
    engineRef.current?.setFocus(idx >= 0 ? idx : null)
  }, [focus, specs])

  const blockAt = (x: number, y: number): FieldKey | null => {
    if (!layout) return null
    const pad = layout.spacing * 1.2
    for (const b of layout.blocks) {
      if (b.keys.length !== 1) continue
      if (x >= b.x0 - pad && x <= b.x1 + pad && y >= b.top - 40 && y <= b.bottom + pad) {
        return b.keys[0] as FieldKey
      }
    }
    return null
  }

  const onMove = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    engineRef.current?.setPointer(e.pointerType === 'mouse' ? p : null)
    onFocus?.(blockAt(p.x, p.y))
  }

  const onLeave = () => {
    engineRef.current?.setPointer(null)
    onFocus?.(null)
  }

  return (
    <div
      ref={wrapRef}
      className="relative w-full select-none"
      style={{ height }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 size-full"
        style={{ width: '100%', height }}
      />
      <p className="sr-only">{description}</p>
      {layout &&
        stage === 'ready' &&
        layout.blocks.map((b) => {
          const key = b.keys[0] as FieldKey
          /* A lone group that hasn't come away yet is still "what's left". */
          const single = b.keys.length === 1 && specs.find((s) => s.key === key)?.detached === true
          const text = single ? labels[key] : mergedLabel
          const narrow = b.x1 - b.x0 < 34
          if (narrow && single) return null
          const dim = focus !== null && (!single || focus !== key)
          return (
            <div
              key={b.keys.join('+')}
              aria-hidden
              className="field-label pointer-events-none absolute left-0 top-0 whitespace-nowrap font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--ink-2)]"
              style={{
                transform: `translate3d(${b.x0}px, ${b.top - 22}px, 0)`,
                opacity: dim ? 0.25 : 1,
              }}
            >
              <span
                className="mr-1.5 inline-block size-1.5 translate-y-[-1px] rounded-full align-middle"
                style={{ background: single ? GROUP_TONES[key].swatch : 'var(--ink)' }}
              />
              {text}
            </div>
          )
        })}
    </div>
  )
}


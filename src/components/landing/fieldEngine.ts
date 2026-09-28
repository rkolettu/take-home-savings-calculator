/**
 * A small Canvas 2D particle engine for the paycheck sculpture.
 *
 * Each dot springs toward a target from `layoutField`, released on a wave
 * that sweeps left to right so a change reads as money moving rather than a
 * redraw. Depth is faked: every dot has a z that scales it and sets how far
 * it shifts with the pointer. The loop sleeps once everything has settled,
 * so an idle page costs nothing.
 */
import type { DotTarget } from './fieldLayout'

export interface DotStyle {
  rgb: [number, number, number]
  hollow?: boolean
}

type StyleFor = (group: number, part: number) => DotStyle

const STIFFNESS = 70
const DAMPING = 2 * Math.sqrt(STIFFNESS) * 0.92
/** How long the release wave takes to cross the field, in ms. */
const WAVE_MS = 420
const REPEL_RADIUS = 46
const REPEL_FORCE = 2600

export class FieldEngine {
  private ctx: CanvasRenderingContext2D
  private cap: number
  private x: Float32Array
  private y: Float32Array
  private vx: Float32Array
  private vy: Float32Array
  private tx: Float32Array
  private ty: Float32Array
  private z: Float32Array
  private col: Float32Array
  private tcol: Float32Array
  private a: Float32Array
  private ta: Float32Array
  private hl: Float32Array
  private hollow: Uint8Array
  private group: Int16Array
  private release: Float64Array
  private width = 0
  private height = 0
  private dpr = 1
  private radius = 3
  private raf = 0
  private last = 0
  private pointer: { x: number; y: number } | null = null
  private tilt = { x: 0, y: 0 }
  private focus: number | null = null
  private dimmed = false
  reduced = false

  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement, capacity: number) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas unavailable')
    this.ctx = ctx
    this.cap = capacity
    this.x = new Float32Array(capacity)
    this.y = new Float32Array(capacity)
    this.vx = new Float32Array(capacity)
    this.vy = new Float32Array(capacity)
    this.tx = new Float32Array(capacity)
    this.ty = new Float32Array(capacity)
    this.z = new Float32Array(capacity)
    this.col = new Float32Array(capacity * 3)
    this.tcol = new Float32Array(capacity * 3)
    this.a = new Float32Array(capacity)
    this.ta = new Float32Array(capacity)
    this.hl = new Float32Array(capacity).fill(1)
    this.hollow = new Uint8Array(capacity)
    this.group = new Int16Array(capacity).fill(-1)
    this.release = new Float64Array(capacity)
    for (let i = 0; i < capacity; i++) this.z[i] = Math.random()
  }

  resize(width: number, height: number, dpr: number) {
    this.width = width
    this.height = height
    this.dpr = dpr
    this.canvas.width = Math.round(width * dpr)
    this.canvas.height = Math.round(height * dpr)
    this.kick()
  }

  /** Throw every dot into a loose cloud — the state the entrance gathers from. */
  scatter(count: number) {
    for (let i = 0; i < Math.min(count, this.cap); i++) {
      this.x[i] = Math.random() * this.width
      this.y[i] = Math.random() * this.height
      this.vx[i] = this.vy[i] = 0
      this.a[i] = 0
      this.ta[i] = 0.18 + Math.random() * 0.25
      this.tcol.set([23, 23, 23], i * 3)
      this.col.set([23, 23, 23], i * 3)
      this.tx[i] = this.x[i]
      this.ty[i] = this.y[i]
    }
    this.kick()
  }

  setLayout(dots: DotTarget[], styleFor: StyleFor, spacing: number) {
    const now = performance.now()
    const n = Math.min(dots.length, this.cap)
    this.radius = Math.max(1.1, spacing * 0.34)
    for (let i = 0; i < this.cap; i++) {
      if (i < n) {
        const d = dots[i]
        const s = styleFor(d.group, d.part)
        const wasHidden = this.a[i] < 0.02 && this.ta[i] < 0.02
        this.tx[i] = d.x
        this.ty[i] = d.y
        if (wasHidden || this.reduced) {
          this.x[i] = d.x
          this.y[i] = this.reduced ? d.y : d.y + spacing * 3
          this.vx[i] = this.vy[i] = 0
          if (this.reduced) this.col.set(s.rgb, i * 3)
        }
        this.tcol.set(s.rgb, i * 3)
        this.hollow[i] = s.hollow ? 1 : 0
        this.group[i] = d.group
        this.ta[i] = 1
        if (this.reduced) this.a[i] = 1
        this.release[i] = now + (d.x / Math.max(this.width, 1)) * WAVE_MS + Math.random() * 60
      } else {
        this.ta[i] = 0
        this.group[i] = -1
        if (this.reduced) this.a[i] = 0
      }
    }
    this.applyFocus()
    this.kick()
  }

  /** Dim every group but one; null restores them all. */
  setFocus(group: number | null) {
    if (this.focus === group) return
    this.focus = group
    this.applyFocus()
    this.kick()
  }

  private applyFocus() {
    this.dimmed = this.focus !== null
  }

  setPointer(p: { x: number; y: number } | null) {
    this.pointer = this.reduced ? null : p
    this.kick()
  }

  kick() {
    if (this.raf) return
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  stop() {
    cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  private frame = (now: number) => {
    this.raf = 0
    const dt = Math.min((now - this.last) / 1000, 1 / 30)
    this.last = now
    const active = this.step(dt, now)
    this.draw()
    if (active) this.raf = requestAnimationFrame(this.frame)
  }

  /** Advance one tick. Returns whether anything is still moving. */
  private step(dt: number, now: number): boolean {
    let moving = false
    const p = this.pointer
    const k = this.reduced ? 1 : 1 - Math.exp(-dt * 7)

    /* Pointer tilt: dots shift by their depth, a quiet sense of volume. */
    const goalX = p ? (p.x / Math.max(this.width, 1) - 0.5) * 2 : 0
    const goalY = p ? (p.y / Math.max(this.height, 1) - 0.5) * 2 : 0
    this.tilt.x += (goalX - this.tilt.x) * k
    this.tilt.y += (goalY - this.tilt.y) * k
    if (Math.abs(goalX - this.tilt.x) > 0.002 || Math.abs(goalY - this.tilt.y) > 0.002) moving = true

    for (let i = 0; i < this.cap; i++) {
      if (this.a[i] < 0.004 && this.ta[i] < 0.004) continue

      if (this.reduced) {
        this.x[i] = this.tx[i]
        this.y[i] = this.ty[i]
      } else if (now >= this.release[i]) {
        let fx = STIFFNESS * (this.tx[i] - this.x[i]) - DAMPING * this.vx[i]
        let fy = STIFFNESS * (this.ty[i] - this.y[i]) - DAMPING * this.vy[i]
        if (p) {
          const dx = this.x[i] - p.x
          const dy = this.y[i] - p.y
          const d2 = dx * dx + dy * dy
          if (d2 < REPEL_RADIUS * REPEL_RADIUS && d2 > 0.01) {
            const d = Math.sqrt(d2)
            const f = (1 - d / REPEL_RADIUS) ** 2 * REPEL_FORCE
            fx += (dx / d) * f
            fy += (dy / d) * f
          }
        }
        this.vx[i] += fx * dt
        this.vy[i] += fy * dt
        this.x[i] += this.vx[i] * dt
        this.y[i] += this.vy[i] * dt
        if (
          Math.abs(this.vx[i]) > 0.5 ||
          Math.abs(this.vy[i]) > 0.5 ||
          Math.abs(this.tx[i] - this.x[i]) > 0.3 ||
          Math.abs(this.ty[i] - this.y[i]) > 0.3
        ) {
          moving = true
        }
      } else {
        moving = true
      }

      const ck = this.reduced ? 1 : now >= this.release[i] ? 1 - Math.exp(-dt * 6) : 0
      for (let c = 0; c < 3; c++) {
        const j = i * 3 + c
        const diff = this.tcol[j] - this.col[j]
        this.col[j] += diff * ck
        if (Math.abs(diff) > 0.6) moving = true
      }
      const ak = this.reduced ? 1 : 1 - Math.exp(-dt * 5)
      const da = this.ta[i] - this.a[i]
      this.a[i] += da * ak
      if (Math.abs(da) > 0.004) moving = true

      const focusTarget =
        !this.dimmed || this.group[i] === this.focus ? 1 : 0.16
      const dh = focusTarget - this.hl[i]
      this.hl[i] += dh * (this.reduced ? 1 : 1 - Math.exp(-dt * 10))
      if (Math.abs(dh) > 0.004) moving = true
    }
    return moving || p !== null
  }

  private draw() {
    const { ctx } = this
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, this.width, this.height)
    const tiltX = this.tilt.x * 5
    const tiltY = this.tilt.y * 3
    for (let i = 0; i < this.cap; i++) {
      const alpha = this.a[i] * this.hl[i]
      if (alpha < 0.01) continue
      const z = this.z[i]
      const lift = this.dimmed && this.group[i] === this.focus ? 1.12 : 1
      const r = this.radius * (0.84 + 0.32 * z) * lift
      const px = this.x[i] + tiltX * (z - 0.5)
      const py = this.y[i] + tiltY * (z - 0.5)
      const j = i * 3
      const rgb = `rgb(${this.col[j] | 0},${this.col[j + 1] | 0},${this.col[j + 2] | 0})`
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(px, py, r, 0, Math.PI * 2)
      if (this.hollow[i]) {
        ctx.strokeStyle = rgb
        ctx.lineWidth = 1
        ctx.stroke()
      } else {
        ctx.fillStyle = rgb
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }
}

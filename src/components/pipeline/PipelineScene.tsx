import { PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { MotionValue } from 'motion/react'
import type { ReactNode, RefObject } from 'react'
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { percent } from '../../lib/format'
import type { PipelineFlow } from '../../lib/pipeline'
import { ParticleStream } from './ParticleStream'
import { SavingsCluster } from './SavingsCluster'
import { CLUSTER, COST_END, FLOW_COLORS, JUNCTION, TAX_END } from './pipelineTheme'

export interface PipelineSceneProps {
  flow: PipelineFlow
  /** Share of the particle pool in flight, 0–1. Scales with gross income. */
  density: number
  /** False while the hero is off-screen: the render loop stops entirely. */
  active: boolean
  reducedMotion: boolean
  /** Hero scroll progress, 0 at the top of the page → 1 once scrolled past. */
  scrollProgress: MotionValue<number>
  particleCount: number
}

type Vec3 = [number, number, number]

/** A label anchor partway along a branch — where its particles are still visible. */
function alongBranch(end: Vec3, t: number, lift: number): Vec3 {
  return [
    JUNCTION[0] + (end[0] - JUNCTION[0]) * t + 0.55,
    JUNCTION[1] + (end[1] - JUNCTION[1]) * t + Math.sign(end[1]) * lift,
    JUNCTION[2] + (end[2] - JUNCTION[2]) * t,
  ]
}

/** Annual savings at which the cluster reaches full size. */
const FULL_CLUSTER_SAVINGS = 200_000
/** Scene units the pipeline needs, junction → cluster and branch tip → tip. */
const SCENE_WIDTH = 6
const SCENE_HEIGHT = 6.4

/**
 * Fits the pipeline to whatever box the canvas is given. On a wide hero the
 * cluster sits right of centre, clear of the copy column; in a narrow,
 * stacked layout the scene centres on the junction → cluster run and lets
 * the intake bleed off the left edge.
 */
function Fit({ children }: { children: ReactNode }) {
  const { width, height } = useThree((s) => s.viewport)
  const wide = width / height > 1.3
  const scale = Math.min(
    (width * (wide ? 0.36 : 0.78)) / SCENE_WIDTH,
    (height * 0.82) / SCENE_HEIGHT,
    1.1,
  )
  const clusterX = wide ? width * 0.3 : width * 0.18
  return (
    <group position={[clusterX - CLUSTER[0] * scale, 0, 0]} scale={scale}>
      {children}
    </group>
  )
}

/** Pointer parallax plus a slow scroll-driven dolly toward the cluster. */
function CameraRig({
  scrollProgress,
  animate,
}: {
  scrollProgress: MotionValue<number>
  animate: boolean
}) {
  useFrame((state, delta) => {
    const cam = state.camera
    const p = scrollProgress.get()
    const k = animate ? 1 - Math.exp(-Math.min(delta, 0.05) * 3) : 1
    const px = animate ? state.pointer.x * 0.7 : 0
    const py = animate ? state.pointer.y * 0.45 : 0
    cam.position.x += (px - cam.position.x) * k
    cam.position.y += (0.4 + py - p * 0.6 - cam.position.y) * k
    cam.position.z += (9.5 - p * 2.2 - cam.position.z) * k
    cam.lookAt(0, 0, 0)
  })
  return null
}

/**
 * Pins DOM labels to scene anchors. Each frame it projects the anchors to
 * screen space and writes a transform straight onto the label elements — no
 * React render, and the text stays crisp, selectable-free HTML rather than
 * a texture.
 */
function LabelTracker({
  anchors,
  labels,
}: {
  anchors: Vec3[]
  labels: RefObject<(HTMLDivElement | null)[]>
}) {
  const group = useRef<THREE.Group>(null)
  const v = useRef(new THREE.Vector3())
  useFrame(({ camera, size }) => {
    const g = group.current
    if (!g) return
    /* Matrices are normally refreshed during render, after this runs. On a
       render-on-demand frame (reduced motion) there is no previous frame to
       lean on, so bring them up to date first. */
    g.updateWorldMatrix(true, false)
    camera.updateMatrixWorld()
    anchors.forEach((anchor, i) => {
      const el = labels.current[i]
      if (!el) return
      v.current.set(...anchor).applyMatrix4(g.matrixWorld).project(camera)
      const x = ((v.current.x + 1) / 2) * size.width
      const y = ((1 - v.current.y) / 2) * size.height
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`
      el.style.opacity = v.current.z < 1 ? '1' : '0'
    })
  })
  return <group ref={group} />
}

export default function PipelineScene({
  flow,
  density,
  active,
  reducedMotion,
  scrollProgress,
  particleCount,
}: PipelineSceneProps) {
  const animate = !reducedMotion
  const [dpr, setDpr] = useState(1.75)
  const labelRefs = useRef<(HTMLDivElement | null)[]>([])

  const fill = flow.deficit ? 0.06 : THREE.MathUtils.clamp(flow.save / 0.5, 0.08, 1)
  const radius =
    0.55 + 0.8 * Math.sqrt(THREE.MathUtils.clamp(flow.annualSavings / FULL_CLUSTER_SAVINGS, 0, 1))

  const labels = [
    {
      anchor: alongBranch(TAX_END, 0.72, 0.35),
      color: FLOW_COLORS.tax,
      label: 'Taxes',
      value: flow.tax,
    },
    {
      anchor: alongBranch(COST_END, 0.72, 0.35),
      color: flow.deficit ? FLOW_COLORS.deficit : FLOW_COLORS.cost,
      label: 'Living costs',
      value: flow.cost,
    },
    {
      anchor: [CLUSTER[0], CLUSTER[1] - radius - 0.7, CLUSTER[2]] as Vec3,
      color: flow.deficit ? FLOW_COLORS.deficit : FLOW_COLORS.save,
      label: flow.deficit ? 'Deficit' : 'Saved',
      value: flow.save,
    },
  ]

  return (
    <div className="relative size-full">
      <Canvas
        flat
        dpr={dpr}
        camera={{ position: [0, 0.4, 9.5], fov: 40 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        frameloop={!active ? 'never' : animate ? 'always' : 'demand'}
        aria-hidden
      >
        {/* Steps resolution down on a GPU that can't hold frame rate, and back up when it recovers. */}
        <PerformanceMonitor
          onDecline={() => setDpr(1)}
          onIncline={() => setDpr(1.75)}
          flipflops={3}
          onFallback={() => setDpr(1)}
        />
        <CameraRig scrollProgress={scrollProgress} animate={animate} />
        <Fit>
          <ParticleStream
            tax={flow.tax}
            cost={flow.cost}
            density={density}
            deficit={flow.deficit}
            count={particleCount}
            animate={animate}
          />
          <SavingsCluster fill={fill} radius={radius} deficit={flow.deficit} animate={animate} />
          <LabelTracker anchors={labels.map((l) => l.anchor)} labels={labelRefs} />
        </Fit>
      </Canvas>

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {labels.map((l, i) => (
          <div
            key={l.label}
            ref={(el) => {
              labelRefs.current[i] = el
            }}
            className="absolute left-0 top-0 opacity-0 transition-opacity duration-500"
          >
            <div className="flex select-none items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-raised)_88%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.085em] text-[var(--text-muted)] shadow-[var(--shadow-soft)] backdrop-blur-sm">
              <span className="size-1.5 rounded-full" style={{ background: l.color }} />
              {l.label}
              <span className="tabular-nums text-[var(--text-primary)]">{percent(l.value)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

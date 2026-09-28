/* three.js buffers and uniforms are mutated in place inside useFrame — the
   idiomatic react-three-fiber render loop, which the React Compiler rules
   below cannot model. */
/* oxlint-disable react/immutability, react/purity */
import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import {
  CLUSTER,
  COST_END,
  FLOW_COLORS,
  INTAKE,
  JUNCTION,
  SPLIT,
  TAX_END,
} from './pipelineTheme'

interface ParticleStreamProps {
  /** Share of gross lost to tax, 0–1. */
  tax: number
  /** Share of gross spent on living costs, 0–1. */
  cost: number
  /** Share of the particle pool that is alive, 0–1. Scales with income. */
  density: number
  deficit: boolean
  count: number
  /** False under prefers-reduced-motion: the stream holds still. */
  animate: boolean
}

/*
 * Geometry lives entirely in the vertex shader. The CPU only advances each
 * particle's life `aT` and, at the moment it crosses the junction, deals it
 * into a lane using the current shares. Deciding the lane there — not every
 * frame — means dragging a slider re-routes new particles while ones already
 * mid-branch finish their path, so nothing ever teleports.
 */
const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uSplit;
  uniform vec3 uIntake;
  uniform vec3 uJunction;
  uniform vec3 uCluster;
  uniform vec3 uTaxEnd;
  uniform vec3 uCostEnd;
  uniform vec3 uInflowA;
  uniform vec3 uInflowB;
  uniform vec3 uTaxColor;
  uniform vec3 uCostColor;
  uniform vec3 uSaveColor;

  attribute vec4 aSeed;
  attribute float aT;
  attribute float aLane;
  attribute float aAlive;

  varying vec3 vColor;
  varying float vAlpha;

  vec3 bezier(vec3 a, vec3 b, vec3 c, float t) {
    float s = 1.0 - t;
    return s * s * a + 2.0 * s * t * b + t * t * c;
  }

  void main() {
    float t = aT;
    float angle = aSeed.z * 6.28318 + t * 9.0;
    float radius = 0.08 + 0.2 * sqrt(aSeed.w);
    vec3 tube = vec3(0.0, cos(angle), sin(angle)) * radius;
    vec3 jitter = (aSeed.xyz - 0.5) * 2.0;

    vec3 pos;
    vec3 color;
    float alpha = 1.0;
    float size = 1.0;

    if (t < uSplit) {
      // Trunk: a funnel that tightens from intake to junction.
      float u = t / uSplit;
      pos = mix(uIntake, uJunction, u) + tube * mix(2.4, 1.0, u);
      pos.y += sin(u * 3.2 - uTime * 0.7) * 0.14 * (1.0 - u);
      color = mix(uInflowA, uInflowB, smoothstep(0.2, 1.0, u));
      alpha = smoothstep(0.0, 0.14, u) * 0.7;
    } else {
      float u = (t - uSplit) / (1.0 - uSplit);
      vec3 start = uJunction + tube;
      float blend = smoothstep(0.0, 0.3, u);

      if (aLane < 0.5) {
        // Taxes: arc up and away, dissipating as they go.
        vec3 ctrl = uJunction + vec3(1.6, 0.2, -0.3);
        pos = bezier(start, ctrl, uTaxEnd, u) + jitter * u * u * 0.9;
        pos.x += sin(uTime * 0.7 + aSeed.x * 6.28) * 0.15 * u;
        color = mix(uInflowB, uTaxColor, blend);
        alpha = (1.0 - smoothstep(0.45, 1.0, u)) * 0.9;
      } else if (aLane < 1.5) {
        // Living costs: arc down and toward the viewer, fading out.
        vec3 ctrl = uJunction + vec3(1.6, -0.2, 0.3);
        pos = bezier(start, ctrl, uCostEnd, u) + jitter * u * u * 0.9;
        pos.x += cos(uTime * 0.6 + aSeed.y * 6.28) * 0.15 * u;
        color = mix(uInflowB, uCostColor, blend);
        alpha = (1.0 - smoothstep(0.45, 1.0, u)) * 0.8;
      } else {
        // Savings: hold together and spiral into the cluster.
        float e = u * u * (3.0 - 2.0 * u);
        float a2 = angle + u * 7.0;
        vec3 spiral = vec3(0.0, cos(a2), sin(a2)) * radius * (1.0 - 0.85 * e);
        pos = bezier(uJunction, uJunction + vec3(2.4, 0.0, 0.0), uCluster, e) + spiral;
        color = mix(uInflowB, uSaveColor, smoothstep(0.0, 0.4, u));
        alpha = (1.0 - smoothstep(0.86, 1.0, u)) * 0.85;
        size = 1.0 + 0.3 * u;
      }
    }

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * size * (0.55 + 0.9 * aSeed.x) * uPixelRatio / -mv.z;
    vColor = color;
    vAlpha = alpha * aAlive;
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Crisp ink dots rather than glow: on a light page, additive light
    // washes out, so each particle is a small, solid disc.
    float d = length(gl_PointCoord - 0.5);
    float a = vAlpha * (1.0 - smoothstep(0.3, 0.5, d));
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
    #include <colorspace_fragment>
  }
`

const LANE_TAX = 0
const LANE_COST = 1
const LANE_SAVE = 2
/** Share of a particle's life advanced per second, before per-particle jitter. */
const SPEED = 0.1

const color = (hex: string) => new THREE.Color(hex)

function pickLane(tax: number, cost: number) {
  const r = Math.random()
  return r < tax ? LANE_TAX : r < tax + cost ? LANE_COST : LANE_SAVE
}

export function ParticleStream({
  tax,
  cost,
  density,
  deficit,
  count,
  animate,
}: ParticleStreamProps) {
  const dpr = useThree((s) => s.viewport.dpr)
  const invalidate = useThree((s) => s.invalidate)

  /* The frame loop reads the latest inputs through a ref so a slider drag
     never re-creates buffers or the material. */
  const flow = useRef({ tax, cost, density })
  useLayoutEffect(() => {
    flow.current = { tax, cost, density }
  }, [tax, cost, density])

  const buffers = useMemo(() => {
    const seed = new Float32Array(count * 4)
    const life = new Float32Array(count)
    const lane = new Float32Array(count)
    const alive = new Float32Array(count)
    const speed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      for (let k = 0; k < 4; k++) seed[i * 4 + k] = Math.random()
      life[i] = Math.random()
      speed[i] = 0.75 + 0.5 * Math.random()
    }
    return { seed, life, lane, alive, speed }
  }, [count])

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(buffers.seed, 4))
    for (const [name, array] of [
      ['aT', buffers.life],
      ['aLane', buffers.lane],
      ['aAlive', buffers.alive],
    ] as const) {
      g.setAttribute(
        name,
        new THREE.BufferAttribute(array, 1).setUsage(THREE.DynamicDrawUsage),
      )
    }
    return g
  }, [buffers, count])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: 22 },
          uPixelRatio: { value: 1 },
          uSplit: { value: SPLIT },
          uIntake: { value: new THREE.Vector3(...INTAKE) },
          uJunction: { value: new THREE.Vector3(...JUNCTION) },
          uCluster: { value: new THREE.Vector3(...CLUSTER) },
          uTaxEnd: { value: new THREE.Vector3(...TAX_END) },
          uCostEnd: { value: new THREE.Vector3(...COST_END) },
          uInflowA: { value: color(FLOW_COLORS.inflowA) },
          uInflowB: { value: color(FLOW_COLORS.inflowB) },
          uTaxColor: { value: color(FLOW_COLORS.tax) },
          uCostColor: { value: color(FLOW_COLORS.cost) },
          uSaveColor: { value: color(FLOW_COLORS.save) },
        },
      }),
    [],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useEffect(() => {
    material.uniforms.uPixelRatio.value = dpr
  }, [dpr, material])

  /* Deal every particle afresh. Runs on mount and, when the stream is held
     still for reduced motion, on every input change — there is no flow to
     carry the change through gradually. */
  const redeal = useCallback(() => {
    const { lane, alive } = buffers
    const { tax: t, cost: c, density: d } = flow.current
    for (let i = 0; i < count; i++) {
      lane[i] = pickLane(t, c)
      alive[i] = Math.random() < d ? 1 : 0
    }
    geometry.attributes.aLane.needsUpdate = true
    geometry.attributes.aAlive.needsUpdate = true
  }, [buffers, geometry, count])

  useEffect(redeal, [redeal])

  useEffect(() => {
    if (!animate) {
      redeal()
      invalidate()
    }
  }, [animate, tax, cost, density, deficit, redeal, invalidate])

  const costColor = useMemo(() => color(FLOW_COLORS.cost), [])
  const deficitColor = useMemo(() => color(FLOW_COLORS.deficit), [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20)
    const u = material.uniforms

    /* The costs branch warms toward red while costs outrun take-home. */
    u.uCostColor.value.lerp(
      deficit ? deficitColor : costColor,
      animate ? 1 - Math.exp(-dt * 3) : 1,
    )

    if (!animate) return
    u.uTime.value += dt

    const { life, lane, alive, speed } = buffers
    const { tax: t, cost: c, density: d } = flow.current
    let dealt = false
    for (let i = 0; i < count; i++) {
      const prev = life[i]
      let next = prev + dt * SPEED * speed[i]
      if (prev < SPLIT && next >= SPLIT) {
        lane[i] = pickLane(t, c)
        dealt = true
      }
      if (next >= 1) {
        next -= 1
        alive[i] = Math.random() < d ? 1 : 0
        dealt = true
      }
      life[i] = next
    }
    geometry.attributes.aT.needsUpdate = true
    if (dealt) {
      geometry.attributes.aLane.needsUpdate = true
      geometry.attributes.aAlive.needsUpdate = true
    }
  })

  return (
    <points geometry={geometry} material={material} frustumCulled={false} />
  )
}

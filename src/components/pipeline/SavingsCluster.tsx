/* three.js buffers and uniforms are mutated in place inside useFrame — the
   idiomatic react-three-fiber render loop, which the React Compiler rules
   below cannot model. */
/* oxlint-disable react/immutability, react/purity */
import { Billboard } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CLUSTER, FLOW_COLORS } from './pipelineTheme'

interface SavingsClusterProps {
  /** How much of the lattice is lit, 0–1. Tracks the savings share. */
  fill: number
  /** World-space radius. Tracks annual savings in dollars. */
  radius: number
  deficit: boolean
  animate: boolean
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uFill;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec3 uColor;
  uniform vec3 uCore;

  attribute float aRank;
  attribute vec3 aSeed;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float breathe = 1.0 + 0.035 * sin(uTime * 1.6 + aSeed.x * 6.28318);
    vec4 mv = modelViewMatrix * vec4(position * breathe, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.6 + 0.8 * aSeed.z) * uPixelRatio / -mv.z;

    // Points light up in rank order, so the lattice fills in as savings grow.
    float lit = 1.0 - smoothstep(uFill - 0.05, uFill, aRank);
    vColor = mix(uCore, uColor, smoothstep(0.0, 0.9, length(position)));
    vAlpha = lit * (0.45 + 0.5 * aSeed.y);
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = vAlpha * (1.0 - smoothstep(0.3, 0.5, d));
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
    #include <colorspace_fragment>
  }
`

/* The halo is a camera-facing quad rather than one huge point sprite: many
   mobile GPUs cap gl_PointSize well below the size a halo needs. */
const glowVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const glowFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = pow(1.0 - smoothstep(0.0, 1.0, d), 2.6) * uStrength;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`

/**
 * Unit-radius lattice: points strung along an icosahedron's 30 edges, a
 * Fibonacci shell inside it and a loose core. Ranks are shuffled so the
 * cluster densifies evenly rather than drawing itself edge by edge.
 */
function buildLattice() {
  const points: number[] = []
  const edges = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1, 0))
  const e = edges.attributes.position.array
  const PER_EDGE = 14
  for (let i = 0; i < e.length; i += 6) {
    for (let k = 0; k < PER_EDGE; k++) {
      const t = k / PER_EDGE
      points.push(
        e[i] + (e[i + 3] - e[i]) * t,
        e[i + 1] + (e[i + 4] - e[i + 1]) * t,
        e[i + 2] + (e[i + 5] - e[i + 2]) * t,
      )
    }
  }
  edges.dispose()

  const SHELL = 320
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < SHELL; i++) {
    const y = 1 - (i / (SHELL - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = golden * i
    points.push(Math.cos(theta) * r * 0.62, y * 0.62, Math.sin(theta) * r * 0.62)
  }

  for (let i = 0; i < 160; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(Math.random() ** 2 * 0.45)
    points.push(v.x, v.y, v.z)
  }

  const n = points.length / 3
  const rank = new Float32Array(n)
  const seed = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    rank[i] = Math.random()
    seed[i * 3] = Math.random()
    seed[i * 3 + 1] = Math.random()
    seed[i * 3 + 2] = Math.random()
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
  g.setAttribute('aRank', new THREE.BufferAttribute(rank, 1))
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3))
  return g
}

/** The dense, rotating geometric body that the savings stream pools into. */
export function SavingsCluster({ fill, radius, deficit, animate }: SavingsClusterProps) {
  const dpr = useThree((s) => s.viewport.dpr)
  const invalidate = useThree((s) => s.invalidate)
  const group = useRef<THREE.Group>(null)
  const inner = useRef<THREE.LineSegments>(null)
  /* Starts collapsed so the cluster condenses into view on first paint. */
  const current = useRef({ fill: 0, radius: 0.35 })

  const lattice = useMemo(() => buildLattice(), [])
  const outerEdges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1, 0)),
    [],
  )
  const innerEdges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.62, 1)),
    [],
  )

  const saveColor = useMemo(() => new THREE.Color(FLOW_COLORS.save), [])
  const deficitColor = useMemo(() => new THREE.Color(FLOW_COLORS.deficit), [])

  const pointsMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        uniforms: {
          uTime: { value: 0 },
          uFill: { value: 0 },
          uSize: { value: 20 },
          uPixelRatio: { value: 1 },
          uColor: { value: new THREE.Color(FLOW_COLORS.save) },
          uCore: { value: new THREE.Color(FLOW_COLORS.saveCore) },
        },
      }),
    [],
  )

  const glowMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: glowVertex,
        fragmentShader: glowFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        uniforms: {
          uStrength: { value: 0 },
          uColor: { value: new THREE.Color(FLOW_COLORS.save) },
        },
      }),
    [],
  )

  const lineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: FLOW_COLORS.save,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
    [],
  )

  const glowGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
  const glow = useRef<THREE.Mesh>(null)

  useEffect(
    () => () => {
      for (const d of [lattice, outerEdges, innerEdges, glowGeometry, pointsMaterial, glowMaterial, lineMaterial]) {
        d.dispose()
      }
    },
    [lattice, outerEdges, innerEdges, glowGeometry, pointsMaterial, glowMaterial, lineMaterial],
  )

  useEffect(() => {
    pointsMaterial.uniforms.uPixelRatio.value = dpr
  }, [dpr, pointsMaterial])

  /* Reduced motion renders on demand, so input changes must ask for a frame
     and the damped values below snap straight to their targets. */
  useEffect(() => {
    if (!animate) invalidate()
  }, [animate, fill, radius, deficit, invalidate])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20)
    const k = animate ? 1 - Math.exp(-dt * 2.5) : 1
    const c = current.current
    c.fill += (fill - c.fill) * k
    c.radius += (radius - c.radius) * k

    const tint = deficit ? deficitColor : saveColor
    pointsMaterial.uniforms.uColor.value.lerp(tint, k)
    glowMaterial.uniforms.uColor.value.lerp(tint, k)
    lineMaterial.color.lerp(tint, k)

    pointsMaterial.uniforms.uFill.value = c.fill
    glowMaterial.uniforms.uStrength.value = 0.04 + 0.1 * c.fill
    glow.current?.scale.setScalar(c.radius * 6)
    lineMaterial.opacity = 0.14 + 0.2 * c.fill

    if (group.current) {
      group.current.scale.setScalar(c.radius)
      if (animate) {
        pointsMaterial.uniforms.uTime.value += dt
        group.current.rotation.y += dt * 0.32
        group.current.rotation.z += dt * 0.07
        group.current.rotation.x = Math.sin(pointsMaterial.uniforms.uTime.value * 0.25) * 0.3
      }
    }
    if (inner.current && animate) inner.current.rotation.y -= dt * 0.55
  })

  return (
    <group position={CLUSTER}>
      <Billboard>
        <mesh ref={glow} geometry={glowGeometry} material={glowMaterial} />
      </Billboard>
      <group ref={group}>
        <points geometry={lattice} material={pointsMaterial} frustumCulled={false} />
        <lineSegments geometry={outerEdges} material={lineMaterial} />
        <lineSegments ref={inner} geometry={innerEdges} material={lineMaterial} />
      </group>
    </group>
  )
}

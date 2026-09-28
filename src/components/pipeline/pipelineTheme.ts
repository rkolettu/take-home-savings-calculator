/**
 * Stream colours, shared by the WebGL scene and the DOM legend so a label
 * swatch is always the exact hue of the particles it names. The CSS tokens
 * `--flow-*` in index.css mirror these for Tailwind utilities.
 */
export const FLOW_COLORS = {
  /** Gross income enters as ink and turns accent blue along the trunk. */
  inflowA: '#3a3833',
  inflowB: '#1d4ed8',
  /** Taxes fade out as warm grey ink — money that simply leaves. */
  tax: '#8d8880',
  /* The app's existing warm data colour, so money leaving for living costs
     can't be mistaken for tax (grey) or savings (blue). */
  cost: '#d96b3b',
  save: '#1d4ed8',
  /** Darker blue at the heart of the cluster, where it is densest. */
  saveCore: '#123a9e',
  deficit: '#b64141',
} as const

/** Where the trunk ends and the three branches begin, as a share of a particle's life. */
export const SPLIT = 0.46

/** Scene-space anchors. The pipeline spans roughly x ∈ [-7.5, 4.5]. */
export const INTAKE: [number, number, number] = [-7.5, 0, 0]
export const JUNCTION: [number, number, number] = [-1.6, 0, 0]
export const CLUSTER: [number, number, number] = [2.9, 0, 0]
export const TAX_END: [number, number, number] = [1.0, 2.5, -0.8]
export const COST_END: [number, number, number] = [1.0, -2.5, 0.8]

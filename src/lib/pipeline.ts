/**
 * How one year of gross pay divides into the particle pipeline's three
 * streams. Every share is a fraction of gross, so the three always sum to 1
 * and the particle counts in each branch are honest proportions.
 *
 * Costs are capped at take-home: in a deficit the whole of take-home drains
 * into the costs branch and the savings stream is empty, rather than any
 * share going negative.
 */
export interface PipelineFlow {
  tax: number
  cost: number
  save: number
  /** Annual take-home left after costs, floored at zero. */
  annualSavings: number
  deficit: boolean
}

export function pipelineFlow(
  gross: number,
  totalTax: number,
  annualCost: number,
): PipelineFlow {
  if (gross <= 0) {
    return { tax: 0, cost: 0, save: 0, annualSavings: 0, deficit: false }
  }
  const net = Math.max(0, gross - totalTax)
  const spent = Math.min(Math.max(0, annualCost), net)
  const saved = net - spent
  return {
    tax: Math.min(1, Math.max(0, totalTax / gross)),
    cost: spent / gross,
    save: saved / gross,
    annualSavings: saved,
    deficit: annualCost > net,
  }
}

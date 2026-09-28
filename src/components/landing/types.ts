import type { FilingStatus, HousingTier, Metro } from '../../data/metroData'
import type { CostBreakdown } from '../../lib/costs'
import type { TakeHomeBreakdown } from '../../lib/tax'

/**
 * Everything the landing needs from the calculator. The landing never owns
 * financial state: it reads the calculator's inputs and results and writes
 * back through the calculator's own setters, so the two can't disagree.
 */
export interface LandingModel {
  gross: number
  filingStatus: FilingStatus
  metro: Metro
  housingTier: HousingTier
  costs: CostBreakdown
  takeHome: TakeHomeBreakdown
  wageGrowth: number
  inflationRate: number
  annualReturn: number
  startingBalance: number
  horizonYears: number
  onGrossChange: (gross: number) => void
  onMetroChange: (metroId: string) => void
  onHousingTierChange: (tier: HousingTier) => void
  /** Scroll to the full calculator. */
  onOpenCalculator: () => void
}

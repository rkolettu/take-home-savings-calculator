import { METROS_BY_ID } from '../data/metroData'
import type { HousingTier } from '../data/types'
import { HOUSING_TIER_LABELS } from '../data/types'
import { usd } from './format'

/**
 * Timeline events that change the cash-flow model from a given year forward.
 *
 * Dollar convention: every amount a milestone carries is stated in the
 * dollars of the year it takes effect, and inflates from there. The base
 * year-1 basket follows the same rule from year 1. Salary is nominal
 * throughout — you negotiate a headline number, not a real one.
 */
export type Milestone =
  | { id: string; year: number; kind: 'salary'; grossSalary: number }
  | { id: string; year: number; kind: 'relocate'; metroId: string }
  | { id: string; year: number; kind: 'housing'; housing: number }
  | { id: string; year: number; kind: 'housingTier'; tier: HousingTier }
  | { id: string; year: number; kind: 'expense'; delta: number; label: string }

export type MilestoneKind = Milestone['kind']

export const MILESTONE_KIND_LABELS: Record<MilestoneKind, string> = {
  salary: 'Salary step',
  relocate: 'Relocate',
  housing: 'Housing change',
  housingTier: 'Housing arrangement',
  expense: 'Expense change',
}

/** Human-readable one-liner for a milestone row and the chart tooltip. */
export function describeMilestone(milestone: Milestone): string {
  switch (milestone.kind) {
    case 'salary':
      return `Salary becomes ${usd(milestone.grossSalary)}`
    case 'relocate': {
      const metro = METROS_BY_ID[milestone.metroId]
      return metro
        ? `Relocate to ${metro.city}, ${metro.stateCode}`
        : 'Relocate'
    }
    case 'housing':
      return `Housing becomes ${usd(milestone.housing)}/mo`
    case 'housingTier':
      return `Switch to ${HOUSING_TIER_LABELS[milestone.tier]}`
    case 'expense': {
      const sign = milestone.delta >= 0 ? '+' : '−'
      const amount = usd(Math.abs(milestone.delta))
      const label = milestone.label.trim()
      return `${sign}${amount}/mo${label ? ` — ${label}` : ''}`
    }
  }
}

/** Chronological, with a stable tiebreak so equal years render predictably. */
export function sortMilestones(milestones: Milestone[]): Milestone[] {
  const kindOrder: MilestoneKind[] = [
    'salary',
    'relocate',
    'housingTier',
    'housing',
    'expense',
  ]
  return [...milestones].sort(
    (a, b) =>
      a.year - b.year || kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind),
  )
}

export function createMilestoneId(): string {
  return `m-${Math.random().toString(36).slice(2, 9)}`
}

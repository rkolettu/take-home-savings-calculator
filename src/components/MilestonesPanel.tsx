import { CalendarPlus, ChevronRight, Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { HousingTier } from '../data/metroData'
import {
  HOUSING_TIERS,
  HOUSING_TIER_LABELS,
  METROS,
} from '../data/metroData'
import type { Milestone, MilestoneKind } from '../lib/milestones'
import {
  MILESTONE_KIND_LABELS,
  createMilestoneId,
  describeMilestone,
  sortMilestones,
} from '../lib/milestones'

interface MilestonesPanelProps {
  milestones: Milestone[]
  horizonYears: number
  onChange: (milestones: Milestone[]) => void
}

const KINDS: MilestoneKind[] = [
  'salary',
  'relocate',
  'housingTier',
  'housing',
  'expense',
]

const fieldClass =
  'w-full rounded-md border bg-[var(--surface-2)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--accent)]'

/**
 * Timeline editor. Each milestone changes the cash-flow model from its year
 * forward; the simulation resolves conflicts by recency, so a later
 * relocation replaces an earlier housing override.
 */
export function MilestonesPanel({
  milestones,
  horizonYears,
  onChange,
}: MilestonesPanelProps) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<MilestoneKind>('salary')
  const [year, setYear] = useState(5)
  const [amount, setAmount] = useState(200_000)
  const [metroId, setMetroId] = useState(METROS[0].id)
  const [tier, setTier] = useState<HousingTier>('one_bed')
  const [label, setLabel] = useState('')

  function add() {
    const safeYear = Math.min(Math.max(Math.round(year), 1), horizonYears)
    const id = createMilestoneId()

    const milestone: Milestone =
      kind === 'salary'
        ? { id, year: safeYear, kind, grossSalary: Math.max(0, amount) }
        : kind === 'relocate'
          ? { id, year: safeYear, kind, metroId }
          : kind === 'housing'
            ? { id, year: safeYear, kind, housing: Math.max(0, amount) }
            : kind === 'housingTier'
              ? { id, year: safeYear, kind, tier }
              : { id, year: safeYear, kind: 'expense', delta: amount, label }

    onChange([...milestones, milestone])
    setLabel('')
  }

  function remove(id: string) {
    onChange(milestones.filter((m) => m.id !== id))
  }

  /* The amount field means something different per kind, so its label and
     default move with the selector rather than staying generic. */
  function onKindChange(next: MilestoneKind) {
    setKind(next)
    if (next === 'salary') setAmount(200_000)
    if (next === 'housing') setAmount(3_000)
    if (next === 'expense') setAmount(500)
  }

  const sorted = sortMilestones(milestones)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
          <CalendarPlus className="size-4 text-[var(--text-muted)]" />
          Life milestones & upgrades
        </span>
        <span className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          {milestones.length > 0 && (
            <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
              {milestones.length}
            </span>
          )}
          <ChevronRight
            className="size-4 text-[var(--text-muted)] transition-transform"
            style={{ transform: open ? 'rotate(90deg)' : 'none' }}
          />
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {sorted.length === 0 && (
            <div
              className="rounded-lg border border-dashed px-3 py-4 text-center"
              style={{ borderColor: 'var(--border)' }}
            >
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                No milestones yet
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                The projection assumes your salary grows at the baseline rate
                and nothing else changes. Add an event below to model a
                promotion, a move to another metro, a rent change, or a new
                monthly cost such as a child or a car.
              </p>
            </div>
          )}

          {sorted.length > 0 && (
            <ul className="space-y-1.5">
              {sorted.map((milestone) => (
                <li
                  key={milestone.id}
                  className="flex items-center gap-2 rounded-lg border px-2.5 py-2"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
                    style={{
                      background: 'var(--surface-2)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Y{milestone.year}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-[var(--text-primary)]">
                      {describeMilestone(milestone)}
                    </span>
                    <span className="block text-[11px] text-[var(--text-muted)]">
                      {MILESTONE_KIND_LABELS[milestone.kind]}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(milestone.id)}
                    aria-label={`Remove milestone: ${describeMilestone(milestone)}`}
                    className="shrink-0 rounded-md p-1 text-[var(--text-muted)] hover:text-[var(--status-critical)]"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div
            className="space-y-2.5 rounded-lg border p-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="grid grid-cols-[1fr_80px] gap-2">
              <div>
                <label
                  htmlFor="milestone-kind"
                  className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]"
                >
                  Event
                </label>
                <select
                  id="milestone-kind"
                  value={kind}
                  onChange={(e) => onKindChange(e.target.value as MilestoneKind)}
                  className={fieldClass}
                  style={{ borderColor: 'var(--border)' }}
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {MILESTONE_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="milestone-year"
                  className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]"
                >
                  Year
                </label>
                <input
                  id="milestone-year"
                  type="number"
                  min={1}
                  max={horizonYears}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className={`${fieldClass} tabular-nums`}
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>
            </div>

            {kind === 'housingTier' ? (
              <div>
                <label
                  htmlFor="milestone-tier"
                  className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]"
                >
                  New arrangement
                </label>
                <select
                  id="milestone-tier"
                  value={tier}
                  onChange={(e) => setTier(e.target.value as HousingTier)}
                  className={fieldClass}
                  style={{ borderColor: 'var(--border)' }}
                >
                  {HOUSING_TIERS.map((option) => (
                    <option key={option} value={option}>
                      {HOUSING_TIER_LABELS[option]}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                  Uses that arrangement's benchmark rent in whichever metro you
                  are living in that year, inflated to it.
                </p>
              </div>
            ) : kind === 'relocate' ? (
              <div>
                <label
                  htmlFor="milestone-metro"
                  className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]"
                >
                  Destination
                </label>
                <select
                  id="milestone-metro"
                  value={metroId}
                  onChange={(e) => setMetroId(e.target.value)}
                  className={fieldClass}
                  style={{ borderColor: 'var(--border)' }}
                >
                  {METROS.map((metro) => (
                    <option key={metro.id} value={metro.id}>
                      {metro.city}, {metro.stateCode}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="milestone-amount"
                    className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]"
                  >
                    {kind === 'salary'
                      ? 'New gross salary'
                      : kind === 'housing'
                        ? 'New housing / mo'
                        : 'Change / mo'}
                  </label>
                  <input
                    id="milestone-amount"
                    type="number"
                    step={kind === 'salary' ? 5_000 : 50}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className={`${fieldClass} tabular-nums`}
                    style={{ borderColor: 'var(--border)' }}
                  />
                </div>
                {kind === 'expense' && (
                  <div>
                    <label
                      htmlFor="milestone-label"
                      className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]"
                    >
                      Reason
                    </label>
                    <input
                      id="milestone-label"
                      value={label}
                      placeholder="Child, car…"
                      onChange={(e) => setLabel(e.target.value)}
                      className={fieldClass}
                      style={{ borderColor: 'var(--border)' }}
                    />
                  </div>
                )}
              </div>
            )}

            {kind === 'expense' && (
              <p className="text-[11px] text-[var(--text-muted)]">
                Use a negative number for a cost that goes away, such as a debt
                being paid off.
              </p>
            )}

            <button
              type="button"
              onClick={add}
              className="flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium"
              style={{
                background: 'var(--accent)',
                color: '#ffffff',
              }}
            >
              <Plus className="size-4" />
              Add milestone
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

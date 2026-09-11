import {
  ArrowLeftRight,
  PiggyBank,
  Plus,
  RotateCcw,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import {
  FILING_STATUS_LABELS,
  FILING_STATUSES,
  HOUSING_TIER_LABELS,
  HOUSING_TIERS,
  METROS,
  METROS_BY_ID,
} from '../data/metroData'
import type { FilingStatus, HousingTier } from '../data/metroData'
import type { CostBreakdown, CostKey } from '../lib/costs'
import { COST_CATEGORIES, costsFromMetro, totalCost } from '../lib/costs'
import { savingsRate } from '../lib/forecast'
import { number, parseCurrency, percent, usd } from '../lib/format'
import { loadState } from '../lib/persistence'
import { computeTakeHome } from '../lib/tax'
import { Card } from './Card'
import { MetroSelector } from './MetroSelector'

interface CompareScenario {
  id: number
  metroId: string
  gross: number
  filingStatus: FilingStatus
  housingTier: HousingTier
  costOverrides: Partial<CostBreakdown>
}

interface CompareModalProps {
  onClose: () => void
}

function makeInitialScenarios(): CompareScenario[] {
  const saved = loadState()
  const primaryMetroId =
    saved.metroId && METROS_BY_ID[saved.metroId] ? saved.metroId : 'austin-tx'
  const secondaryMetroId =
    METROS.find((metro) => metro.id !== primaryMetroId)?.id ?? primaryMetroId
  const gross = saved.gross ?? 120_000
  const filingStatus: FilingStatus = 'single'
  const housingTier = saved.housingTier ?? 'roommate'

  return [
    {
      id: 1,
      metroId: primaryMetroId,
      gross,
      filingStatus,
      housingTier,
      costOverrides: {},
    },
    {
      id: 2,
      metroId: secondaryMetroId,
      gross,
      filingStatus,
      housingTier,
      costOverrides: {},
    },
  ]
}

function statusForRate(rate: number) {
  if (rate < 0) return { label: 'Deficit', color: 'var(--status-critical)' }
  if (rate < 0.2) return { label: 'Watch out', color: 'var(--status-warning)' }
  if (rate <= 0.5) return { label: 'Healthy', color: 'var(--status-good)' }
  return { label: 'Very high savings', color: 'var(--accent)' }
}

export function CompareModal({ onClose }: CompareModalProps) {
  const [scenarios, setScenarios] = useState<CompareScenario[]>(makeInitialScenarios)
  const [expandedBaselines, setExpandedBaselines] = useState<Record<number, boolean>>({})
  const nextId = useRef(3)

  const results = useMemo(
    () =>
      scenarios.map((scenario) => {
        const metro = METROS_BY_ID[scenario.metroId]
        const takeHome = computeTakeHome({
          gross: scenario.gross,
          filingStatus: scenario.filingStatus,
          stateCode: metro.stateCode,
          localIncomeTaxRate: metro.localIncomeTaxRate,
          localIncomeTaxThreshold: metro.localIncomeTaxThreshold,
        })
        const baselineCosts = costsFromMetro(metro, scenario.housingTier)
        const costs = { ...baselineCosts, ...scenario.costOverrides }
        const monthlyCost = totalCost(costs)
        const surplus = takeHome.netMonthly - monthlyCost
        const rate = savingsRate(takeHome.netMonthly, monthlyCost)

        return {
          scenario,
          metro,
          takeHome,
          baselineCosts,
          costs,
          monthlyCost,
          surplus,
          rate,
          isCustomBaseline: Object.keys(scenario.costOverrides).length > 0,
          status: statusForRate(rate),
        }
      }),
    [scenarios],
  )

  const rankedResults = [...results].sort((a, b) => b.surplus - a.surplus)
  const bestResult = rankedResults[0]
  const secondResult = rankedResults[1]
  const worstResult = rankedResults[rankedResults.length - 1]
  const bestSurplus = bestResult?.surplus ?? 0
  const bestVsSecond =
    bestResult && secondResult ? Math.max(0, bestResult.surplus - secondResult.surplus) : 0
  const bestVsWorst =
    bestResult && worstResult ? Math.max(0, bestResult.surplus - worstResult.surplus) : 0

  function rankForScenario(id: number) {
    return rankedResults.findIndex((result) => result.scenario.id === id) + 1
  }

  function updateScenario(id: number, patch: Partial<CompareScenario>) {
    setScenarios((current) =>
      current.map((scenario) =>
        scenario.id === id ? { ...scenario, ...patch } : scenario,
      ),
    )
  }

  function updateScenarioCost(id: number, key: CostKey, value: number) {
    setScenarios((current) =>
      current.map((scenario) =>
        scenario.id === id
          ? {
              ...scenario,
              costOverrides: {
                ...scenario.costOverrides,
                [key]: Math.max(0, value),
              },
            }
          : scenario,
      ),
    )
  }

  function changeScenarioMetro(id: number, metroId: string) {
    updateScenario(id, { metroId, costOverrides: {} })
  }

  function changeHousingTier(id: number, housingTier: HousingTier) {
    setScenarios((current) =>
      current.map((scenario) => {
        if (scenario.id !== id) return scenario
        const { housing: _housing, ...remainingOverrides } = scenario.costOverrides
        return { ...scenario, housingTier, costOverrides: remainingOverrides }
      }),
    )
  }

  function resetScenarioCosts(id: number) {
    updateScenario(id, { costOverrides: {} })
  }

  function toggleBaseline(id: number) {
    setExpandedBaselines((current) => ({
      ...current,
      [id]: !current[id],
    }))
  }

  function addScenario() {
    if (scenarios.length >= 3) return
    const used = new Set(scenarios.map((scenario) => scenario.metroId))
    const nextMetro = METROS.find((metro) => !used.has(metro.id)) ?? METROS[0]
    const reference = scenarios[scenarios.length - 1] ?? scenarios[0]

    setScenarios((current) => [
      ...current,
      {
        id: nextId.current++,
        metroId: nextMetro.id,
        gross: reference?.gross ?? 120_000,
        filingStatus: 'single',
        housingTier: reference?.housingTier ?? 'roommate',
        costOverrides: {},
      },
    ])
  }

  function removeScenario(id: number) {
    if (scenarios.length <= 2) return
    setScenarios((current) => current.filter((scenario) => scenario.id !== id))
    setExpandedBaselines((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/35 p-3 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Compare metro and income scenarios"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="mx-auto max-w-6xl overflow-hidden rounded-[24px] border bg-[var(--page)] shadow-2xl"
        style={{ borderColor: 'var(--border)' }}
      >
        <div
          className="sticky top-0 z-30 flex flex-wrap items-start justify-between gap-4 border-b bg-[var(--surface-1)] px-4 py-4 sm:px-6"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              <ArrowLeftRight className="size-4" />
              Quick comparison
            </div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-2xl">
              Compare where your paycheck goes further
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)] sm:text-sm">
              Up to three metros, incomes, filing statuses, housing setups, and adjustable monthly baselines. Current-year snapshot only — no projections.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addScenario}
              disabled={scenarios.length >= 3}
              className="flex items-center gap-1.5 rounded-lg border bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-45"
              style={{ borderColor: 'var(--border)' }}
            >
              <Plus className="size-4" />
              {scenarios.length >= 3 ? '3 max' : 'Add scenario'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close comparison"
              className="rounded-lg border bg-[var(--surface-2)] p-2 text-[var(--text-secondary)]"
              style={{ borderColor: 'var(--border)' }}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          {bestResult && (
            <div
              className="rounded-2xl border p-4 sm:p-5"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent) 32%, var(--border))',
                background: 'var(--accent-soft)',
              }}
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="rounded-xl bg-[var(--surface-raised)] p-2.5 text-[var(--accent)]">
                  <PiggyBank className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--accent)]">
                    Best monthly savings
                  </div>
                  <div className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {bestResult.metro.city}, {bestResult.metro.stateCode} comes out ahead
                  </div>
                  <p className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">
                    {results.length === 3 && secondResult && worstResult
                      ? `${bestResult.metro.city} leaves you with ${usd(bestVsSecond)} more per month than ${secondResult.metro.city}, and ${usd(bestVsWorst)} more per month than ${worstResult.metro.city}.`
                      : bestVsSecond > 0
                        ? `This scenario leaves you with ${usd(bestVsSecond)} more each month than the other option.`
                        : 'The top scenarios are tied for monthly savings.'}
                  </p>
                </div>
              </div>

              {results.length === 3 && secondResult && worstResult ? (
                <>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {rankedResults.map((result, index) => {
                      const rankLabel = index === 0 ? 'Best' : index === 1 ? 'Second' : 'Worst'
                      return (
                        <div
                          key={result.scenario.id}
                          className="rounded-xl bg-[var(--surface-raised)] px-3 py-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                              {index + 1}. {rankLabel}
                            </span>
                            <span className="text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                              {usd(result.surplus)}/mo
                            </span>
                          </div>
                          <div className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">
                            {result.metro.city}, {result.metro.stateCode}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border bg-[var(--surface-raised)] px-4 py-3" style={{ borderColor: 'color-mix(in srgb, var(--accent) 24%, var(--border))' }}>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                        Best vs second
                      </div>
                      <div className="mt-1 text-xl font-semibold tabular-nums text-[var(--accent)]">
                        +{usd(bestVsSecond)} / month
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
                        +{usd(bestVsSecond * 12)} / year vs {secondResult.metro.city}
                      </div>
                    </div>
                    <div className="rounded-xl border bg-[var(--surface-raised)] px-4 py-3" style={{ borderColor: 'color-mix(in srgb, var(--accent) 24%, var(--border))' }}>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                        Best vs worst
                      </div>
                      <div className="mt-1 text-xl font-semibold tabular-nums text-[var(--accent)]">
                        +{usd(bestVsWorst)} / month
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
                        +{usd(bestVsWorst * 12)} / year vs {worstResult.metro.city}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-4 max-w-[190px] rounded-xl bg-[var(--surface-raised)] px-4 py-3">
                  <div className="text-2xl font-semibold tracking-tight tabular-nums text-[var(--accent)]">
                    {bestVsSecond > 0 ? `+${usd(bestVsSecond)}` : usd(bestResult.surplus)}
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-[var(--text-secondary)]">
                    {bestVsSecond > 0 ? 'more / month' : 'left / month'}
                  </div>
                  {bestVsSecond > 0 && (
                    <div className="mt-1 text-[11px] tabular-nums text-[var(--text-muted)]">
                      {usd(bestVsSecond * 12)} more / year
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {results.map((result, index) => {
              const {
                scenario,
                metro,
                takeHome,
                costs,
                monthlyCost,
                surplus,
                rate,
                status,
                isCustomBaseline,
              } = result
              const rank = rankForScenario(scenario.id)
              const rankLabel =
                results.length === 3
                  ? rank === 1
                    ? 'Best'
                    : rank === 2
                      ? 'Second'
                      : 'Worst'
                  : rank === 1
                    ? 'Best'
                    : undefined
              const baselineOpen = Boolean(expandedBaselines[scenario.id])

              return (
                <Card
                  key={scenario.id}
                  title={`Scenario ${index + 1}`}
                  subtitle={`${metro.city}, ${metro.stateCode}`}
                  action={
                    <div className="flex items-center gap-2">
                      {rankLabel && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{
                            background:
                              rank === 1 ? 'var(--accent-soft)' : 'var(--surface-2)',
                            color:
                              rank === 1 ? 'var(--accent)' : 'var(--text-secondary)',
                          }}
                        >
                          {rank}. {rankLabel}
                        </span>
                      )}
                      {scenarios.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeScenario(scenario.id)}
                          aria-label={`Remove scenario ${index + 1}`}
                          className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--status-critical)]"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  }
                >
                  <div className="space-y-4">
                    <MetroSelector
                      metroId={scenario.metroId}
                      onChange={(metroId) => changeScenarioMetro(scenario.id, metroId)}
                      showCompareButton={false}
                    />

                    <div>
                      <label
                        htmlFor={`compare-income-${scenario.id}`}
                        className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
                      >
                        Gross annual salary
                      </label>
                      <div
                        className="flex items-center rounded-lg border bg-[var(--surface-2)] px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)]"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <span className="text-sm text-[var(--text-muted)]">$</span>
                        <input
                          id={`compare-income-${scenario.id}`}
                          inputMode="numeric"
                          value={number(scenario.gross)}
                          onChange={(event) =>
                            updateScenario(scenario.id, {
                              gross: parseCurrency(event.target.value),
                            })
                          }
                          className="w-full bg-transparent px-1.5 py-2.5 text-sm font-medium tabular-nums text-[var(--text-primary)] focus:outline-none"
                        />
                        <span className="text-xs text-[var(--text-muted)]">/ year</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                          Filing status
                        </span>
                        <select
                          value={scenario.filingStatus}
                          onChange={(event) =>
                            updateScenario(scenario.id, {
                              filingStatus: event.target.value as FilingStatus,
                            })
                          }
                          className="w-full rounded-lg border bg-[var(--surface-2)] px-2.5 py-2.5 text-xs font-medium text-[var(--text-primary)]"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          {FILING_STATUSES.map((filingStatusOption) => (
                            <option key={filingStatusOption} value={filingStatusOption}>
                              {FILING_STATUS_LABELS[filingStatusOption]}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                          Housing
                        </span>
                        <select
                          value={scenario.housingTier}
                          onChange={(event) =>
                            changeHousingTier(
                              scenario.id,
                              event.target.value as HousingTier,
                            )
                          }
                          className="w-full rounded-lg border bg-[var(--surface-2)] px-2.5 py-2.5 text-xs font-medium text-[var(--text-primary)]"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          {HOUSING_TIERS.map((tier) => (
                            <option key={tier} value={tier}>
                              {HOUSING_TIER_LABELS[tier]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div
                      className="overflow-hidden rounded-xl border bg-[var(--surface-2)]"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleBaseline(scenario.id)}
                        aria-expanded={baselineOpen}
                        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-[var(--surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]"
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-[var(--text-primary)]">
                            Adjust baseline costs
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">
                            {isCustomBaseline
                              ? `Custom baseline · ${usd(monthlyCost)}/mo`
                              : `Using ${metro.city} baseline · ${usd(monthlyCost)}/mo`}
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className="flex size-7 shrink-0 items-center justify-center rounded-lg border bg-[var(--surface-1)] text-base leading-none text-[var(--text-secondary)] transition-transform duration-150"
                          style={{
                            borderColor: 'var(--border)',
                            transform: baselineOpen ? 'rotate(180deg)' : 'none',
                          }}
                        >
                          ⌄
                        </span>
                      </button>

                      {baselineOpen && (
                        <div
                          className="border-t bg-[var(--surface-1)] p-3"
                          style={{ borderColor: 'var(--gridline)' }}
                        >
                          <div className="grid gap-2 sm:grid-cols-2">
                            {COST_CATEGORIES.map((category) => (
                              <label key={category.key} className="block">
                                <span className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">
                                  {category.label}
                                </span>
                                <div
                                  className="flex items-center rounded-lg border bg-[var(--surface-2)] px-2 focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-[var(--accent)]"
                                  style={{ borderColor: 'var(--border)' }}
                                >
                                  <span className="text-xs text-[var(--text-muted)]">$</span>
                                  <input
                                    inputMode="numeric"
                                    value={number(costs[category.key])}
                                    onChange={(event) =>
                                      updateScenarioCost(
                                        scenario.id,
                                        category.key,
                                        parseCurrency(event.target.value),
                                      )
                                    }
                                    className="w-full bg-transparent px-1 py-2 text-right text-xs font-medium tabular-nums text-[var(--text-primary)] focus:outline-none"
                                    aria-label={`${category.label} monthly cost for scenario ${index + 1}`}
                                  />
                                </div>
                              </label>
                            ))}
                          </div>

                          <div
                            className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"
                            style={{ borderColor: 'var(--gridline)' }}
                          >
                            <div className="text-xs text-[var(--text-secondary)]">
                              Total <span className="font-semibold tabular-nums text-[var(--text-primary)]">{usd(monthlyCost)}/mo</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => resetScenarioCosts(scenario.id)}
                              disabled={!isCustomBaseline}
                              className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
                              style={{ borderColor: 'var(--border)' }}
                            >
                              <RotateCcw className="size-3.5" />
                              Reset baseline
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div
                      className="rounded-xl border bg-[var(--surface-2)] p-4"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-medium text-[var(--text-muted)]">
                            Monthly left over
                          </div>
                          <div
                            className="mt-1 text-3xl font-semibold tracking-tight tabular-nums"
                            style={{
                              color:
                                surplus < 0
                                  ? 'var(--status-critical)'
                                  : 'var(--text-primary)',
                            }}
                          >
                            {usd(surplus)}
                          </div>
                        </div>
                        <Wallet className="size-5 text-[var(--text-muted)]" />
                      </div>

                      <div
                        className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 text-xs"
                        style={{ borderColor: 'var(--gridline)' }}
                      >
                        <div>
                          <div className="text-[var(--text-muted)]">Take-home</div>
                          <div className="mt-0.5 font-semibold tabular-nums text-[var(--text-primary)]">
                            {usd(takeHome.netMonthly)}/mo
                          </div>
                        </div>
                        <div>
                          <div className="text-[var(--text-muted)]">Baseline costs</div>
                          <div className="mt-0.5 font-semibold tabular-nums text-[var(--text-primary)]">
                            {usd(monthlyCost)}/mo
                          </div>
                        </div>
                        <div>
                          <div className="text-[var(--text-muted)]">Savings rate</div>
                          <div className="mt-0.5 font-semibold tabular-nums text-[var(--text-primary)]">
                            {percent(rate)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[var(--text-muted)]">Status</div>
                          <div className="mt-0.5 font-semibold" style={{ color: status.color }}>
                            {status.label}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          <Card
            title="At a glance"
            subtitle="Same 2026 tax engine and metro cost model as the calculator"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-xs text-[var(--text-muted)]">
                    <th className="pb-3 pr-4 text-left font-medium">Metric</th>
                    {results.map((result, index) => (
                      <th
                        key={result.scenario.id}
                        className="px-3 pb-3 text-right font-medium"
                      >
                        <span className="block text-[var(--text-primary)]">
                          Scenario {index + 1}
                        </span>
                        <span className="block font-normal">
                          {result.metro.city}, {result.metro.stateCode}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: 'Gross salary',
                      values: results.map((result) => usd(result.scenario.gross)),
                    },
                    {
                      label: 'Net monthly pay',
                      values: results.map((result) => usd(result.takeHome.netMonthly)),
                    },
                    {
                      label: 'Monthly taxes',
                      values: results.map((result) => usd(result.takeHome.totalTax / 12)),
                    },
                    {
                      label: 'Baseline monthly costs',
                      values: results.map((result) => usd(result.monthlyCost)),
                    },
                    {
                      label: 'Monthly left over',
                      values: results.map((result) => usd(result.surplus)),
                      emphasis: true,
                    },
                    {
                      label: 'Savings rate',
                      values: results.map((result) => percent(result.rate)),
                    },
                    {
                      label: 'Effective tax rate',
                      values: results.map((result) => percent(result.takeHome.effectiveRate)),
                    },
                  ].map((row) => (
                    <tr
                      key={row.label}
                      className="border-t"
                      style={{ borderColor: 'var(--gridline)' }}
                    >
                      <td className="py-3 pr-4 text-[var(--text-secondary)]">
                        {row.label}
                      </td>
                      {row.values.map((value, index) => {
                        const result = results[index]
                        const isBest =
                          row.emphasis && result && result.surplus === bestSurplus
                        return (
                          <td
                            key={result?.scenario.id ?? index}
                            className="px-3 py-3 text-right font-medium tabular-nums"
                            style={{
                              color: isBest
                                ? 'var(--accent)'
                                : 'var(--text-primary)',
                            }}
                          >
                            {value}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p
              className="mt-4 border-t pt-3 text-xs leading-5 text-[var(--text-muted)]"
              style={{ borderColor: 'var(--gridline)' }}
            >
              Each scenario starts with the metro’s built-in costs for the selected housing tier. Expand “Adjust baseline costs” to override individual monthly expenses; Reset baseline restores the metro defaults. Long-term projections remain excluded so the comparison stays focused on today’s paycheck and monthly budget.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

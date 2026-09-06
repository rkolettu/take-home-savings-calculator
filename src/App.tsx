import {
  ChartSpline,
  Landmark,
  Percent,
  PiggyBank,
  SlidersHorizontal,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AllocationPanel } from './components/AllocationPanel'
import { Card } from './components/Card'
import { HeaderActions } from './components/HeaderActions'
import { CostOfLivingPanel } from './components/CostOfLivingPanel'
import { IncomeInput } from './components/IncomeInput'
import { MetroSelector } from './components/MetroSelector'
import { MilestonesPanel } from './components/MilestonesPanel'
import { ProjectionChart } from './components/ProjectionChart'
import { ProjectionSummary } from './components/ProjectionSummary'
import { SliderField } from './components/SliderField'
import { StatTile } from './components/StatTile'
import { SurplusSummary } from './components/SurplusSummary'
import { TaxBreakdown } from './components/TaxBreakdown'
import type { FilingStatus, HousingTier } from './data/metroData'
import { METROS, METROS_BY_ID } from './data/metroData'
import type { CostKey } from './lib/costs'
import { costsFromMetro, costsMatchDefaults, totalCost } from './lib/costs'
import {
  buildCsv,
  buildSummaryText,
  copyText,
  downloadCsv,
} from './lib/exportSummary'
import { savingsRate } from './lib/forecast'
import { percent, usd } from './lib/format'
import type { Milestone } from './lib/milestones'
import { clearState, loadState, saveState } from './lib/persistence'
import { simulate } from './lib/simulation'
import { computeTakeHome } from './lib/tax'
import type { VehicleReturns, VehicleWeights } from './lib/vehicles'
import { DEFAULT_RETURNS, PRESETS, blendedReturn } from './lib/vehicles'

const DEFAULT_METRO_ID = 'austin-tx'

const DEFAULTS = {
  metroId: DEFAULT_METRO_ID,
  gross: 150_000,
  filingStatus: 'single' as FilingStatus,
  housingTier: 'roommate' as HousingTier,
  costs: costsFromMetro(METROS_BY_ID[DEFAULT_METRO_ID], 'roommate'),
  wageGrowth: 0.035,
  inflationRate: 0.025,
  horizonYears: 20,
  startingBalance: 0,
  weights: PRESETS.index,
  returns: DEFAULT_RETURNS,
  milestones: [] as Milestone[],
  realMode: false,
}

/* Read once at mount. Anything missing or corrupt falls back to a default,
   so a hand-edited or stale storage entry can never break the first render. */
const SAVED = loadState()

export default function App() {
  const [metroId, setMetroId] = useState(SAVED.metroId ?? DEFAULTS.metroId)
  const [gross, setGross] = useState(SAVED.gross ?? DEFAULTS.gross)
  const [filingStatus, setFilingStatus] = useState<FilingStatus>(
    SAVED.filingStatus ?? DEFAULTS.filingStatus,
  )
  const [housingTier, setHousingTier] = useState<HousingTier>(
    SAVED.housingTier ?? DEFAULTS.housingTier,
  )
  const [costs, setCosts] = useState(
    () =>
      SAVED.costs ??
      costsFromMetro(
        METROS_BY_ID[SAVED.metroId ?? DEFAULTS.metroId],
        SAVED.housingTier ?? DEFAULTS.housingTier,
      ),
  )

  const [wageGrowth, setWageGrowth] = useState(
    SAVED.wageGrowth ?? DEFAULTS.wageGrowth,
  )
  const [inflationRate, setInflationRate] = useState(
    SAVED.inflationRate ?? DEFAULTS.inflationRate,
  )
  const [horizonYears, setHorizonYears] = useState(
    SAVED.horizonYears ?? DEFAULTS.horizonYears,
  )
  const [startingBalance, setStartingBalance] = useState(
    SAVED.startingBalance ?? DEFAULTS.startingBalance,
  )
  const [weights, setWeights] = useState<VehicleWeights>({
    ...(SAVED.weights ?? DEFAULTS.weights),
  })
  const [returns, setReturns] = useState<VehicleReturns>({
    ...(SAVED.returns ?? DEFAULTS.returns),
  })
  const [milestones, setMilestones] = useState<Milestone[]>(
    SAVED.milestones ?? DEFAULTS.milestones,
  )
  const [realMode, setRealMode] = useState(SAVED.realMode ?? DEFAULTS.realMode)

  const metro = METROS_BY_ID[metroId]

  /* Changing metro re-seeds the cost inputs. Doing it here rather than in an
     effect keeps the two pieces of state in step within a single render. */
  const selectMetro = useCallback(
    (nextId: string) => {
      setMetroId(nextId)
      setCosts(costsFromMetro(METROS_BY_ID[nextId], housingTier))
    },
    [housingTier],
  )

  /* Picking a tier repopulates the housing line with that benchmark,
     deliberately discarding a manual override — that is what the control
     is for. Every other line is left alone. */
  const selectHousingTier = useCallback(
    (tier: HousingTier) => {
      setHousingTier(tier)
      setCosts((prev) => ({
        ...prev,
        housing: costsFromMetro(METROS_BY_ID[metroId], tier).housing,
      }))
    },
    [metroId],
  )

  const updateCost = useCallback((key: CostKey, value: number) => {
    setCosts((prev) => ({ ...prev, [key]: Math.max(0, value) }))
  }, [])

  const resetCosts = useCallback(() => {
    setCosts(costsFromMetro(METROS_BY_ID[metroId], housingTier))
  }, [metroId, housingTier])

  const takeHome = useMemo(
    () =>
      computeTakeHome({
        gross,
        filingStatus,
        stateCode: metro.stateCode,
        localIncomeTaxRate: metro.localIncomeTaxRate,
      }),
    [gross, filingStatus, metro],
  )

  const monthlyCost = totalCost(costs)
  const surplus = takeHome.netMonthly - monthlyCost
  const rate = savingsRate(takeHome.netMonthly, monthlyCost)
  const isModified = !costsMatchDefaults(costs, metro, housingTier)

  const annualReturn = useMemo(
    () => blendedReturn(weights, returns),
    [weights, returns],
  )

  const simulation = useMemo(
    () =>
      simulate({
        startingGross: gross,
        filingStatus,
        baseMetroId: metroId,
        baseCosts: costs,
        housingTier,
        wageGrowth,
        inflationRate,
        annualReturn,
        startingBalance,
        years: horizonYears,
        milestones,
      }),
    [
      gross,
      filingStatus,
      metroId,
      costs,
      housingTier,
      wageGrowth,
      inflationRate,
      annualReturn,
      startingBalance,
      horizonYears,
      milestones,
    ],
  )

  useEffect(() => {
    saveState({
      metroId,
      gross,
      filingStatus,
      costs,
      housingTier,
      wageGrowth,
      inflationRate,
      horizonYears,
      startingBalance,
      weights,
      returns,
      milestones,
      realMode,
    })
  }, [
    metroId,
    gross,
    filingStatus,
    costs,
    housingTier,
    wageGrowth,
    inflationRate,
    horizonYears,
    startingBalance,
    weights,
    returns,
    milestones,
    realMode,
  ])

  const resetAll = useCallback(() => {
    clearState()
    setMetroId(DEFAULTS.metroId)
    setGross(DEFAULTS.gross)
    setFilingStatus(DEFAULTS.filingStatus)
    setHousingTier(DEFAULTS.housingTier)
    setCosts(costsFromMetro(METROS_BY_ID[DEFAULTS.metroId], DEFAULTS.housingTier))
    setWageGrowth(DEFAULTS.wageGrowth)
    setInflationRate(DEFAULTS.inflationRate)
    setHorizonYears(DEFAULTS.horizonYears)
    setStartingBalance(DEFAULTS.startingBalance)
    setWeights({ ...DEFAULTS.weights })
    setReturns({ ...DEFAULTS.returns })
    setMilestones([])
    setRealMode(DEFAULTS.realMode)
  }, [])

  const copySummary = useCallback(async () => {
    const text = buildSummaryText({
      metro,
      gross,
      netMonthly: takeHome.netMonthly,
      monthlyCost,
      surplus,
      savingsRate: rate,
      effectiveTaxRate: takeHome.effectiveRate,
      annualReturn,
      wageGrowth,
      inflationRate,
      startingBalance,
      result: simulation,
    })
    /* Falls back to execCommand where the Clipboard API is denied; the
       button reports failure only if both paths fail. */
    return copyText(text)
  }, [
    metro,
    gross,
    takeHome,
    monthlyCost,
    surplus,
    rate,
    annualReturn,
    wageGrowth,
    inflationRate,
    startingBalance,
    simulation,
  ])

  const exportCsv = useCallback(
    () =>
      downloadCsv(
        buildCsv(simulation),
        `projection-${metro.id}-${horizonYears}y.csv`,
      ),
    [simulation, metro, horizonYears],
  )

  return (
    <div className="min-h-screen bg-[var(--page)]">
      <header
        className="border-b bg-[var(--surface-1)]"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Landmark className="size-5 shrink-0 text-[var(--accent)]" />
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-[var(--text-primary)]">
                Take-Home Savings Calculator
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                2026 federal, state and local tax across {METROS.length} US
                metros
              </p>
            </div>
          </div>
          <HeaderActions
            onCopySummary={copySummary}
            onDownloadCsv={exportCsv}
            onResetAll={resetAll}
          />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <Card
              title="Location & income"
              subtitle="Pick a metro and enter what you earn before tax"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <MetroSelector metroId={metroId} onChange={selectMetro} />
                <div className="sm:col-span-2">
                  <IncomeInput
                    gross={gross}
                    filingStatus={filingStatus}
                    onGrossChange={setGross}
                    onFilingStatusChange={setFilingStatus}
                  />
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile
                label="Gross monthly"
                value={usd(gross / 12)}
                detail={`${usd(gross)} / yr`}
                icon={<Wallet className="size-3.5" />}
              />
              <StatTile
                label="Net monthly"
                value={usd(takeHome.netMonthly)}
                detail={`${usd(takeHome.net)} / yr`}
                icon={<Wallet className="size-3.5" />}
                emphasis
              />
              <StatTile
                label="Effective rate"
                value={percent(takeHome.effectiveRate)}
                detail="All taxes ÷ gross"
                icon={<Percent className="size-3.5" />}
              />
              <StatTile
                label="Federal marginal"
                value={percent(takeHome.federalMarginalRate, 0)}
                detail="On your next dollar"
                icon={<TrendingUp className="size-3.5" />}
              />
            </div>

            <Card>
              <TaxBreakdown takeHome={takeHome} metro={metro} />
            </Card>

            <Card
              title="Monthly cost of living"
              subtitle={`Seeded from ${metro.city} benchmarks — edit any line`}
              action={
                isModified ? (
                  <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
                    Edited
                  </span>
                ) : undefined
              }
            >
              <CostOfLivingPanel
                costs={costs}
                metro={metro}
                housingTier={housingTier}
                isModified={isModified}
                onCostChange={updateCost}
                onHousingTierChange={selectHousingTier}
                onReset={resetCosts}
              />
            </Card>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Card title="What's left over">
              <SurplusSummary
                netMonthly={takeHome.netMonthly}
                monthlyCost={monthlyCost}
                surplus={surplus}
                rate={rate}
              />
            </Card>
          </aside>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card
              title="Assumptions"
              icon={<SlidersHorizontal className="size-4 text-[var(--text-muted)]" />}
            >
              <div className="space-y-4">
                <SliderField
                  id="wage-growth"
                  label="Annual wage growth"
                  hint="Baseline raise, before milestones"
                  value={wageGrowth * 100}
                  min={0}
                  max={12}
                  step={0.1}
                  suffix="%"
                  onChange={(v) => setWageGrowth(v / 100)}
                />
                <SliderField
                  id="inflation"
                  label="Inflation"
                  hint="Grows costs and deflates real values"
                  value={inflationRate * 100}
                  min={0}
                  max={8}
                  step={0.1}
                  suffix="%"
                  onChange={(v) => setInflationRate(v / 100)}
                />
                <SliderField
                  id="horizon"
                  label="Projection horizon"
                  value={horizonYears}
                  min={1}
                  max={30}
                  step={1}
                  suffix="y"
                  decimals={0}
                  onChange={(v) => setHorizonYears(Math.round(v))}
                />
              </div>
            </Card>

            <Card
              title="Investment allocation"
              icon={<PiggyBank className="size-4 text-[var(--text-muted)]" />}
            >
              <AllocationPanel
                weights={weights}
                returns={returns}
                startingBalance={startingBalance}
                onWeightsChange={setWeights}
                onReturnsChange={setReturns}
                onStartingBalanceChange={setStartingBalance}
              />
            </Card>

            <Card>
              <MilestonesPanel
                milestones={milestones}
                horizonYears={horizonYears}
                onChange={setMilestones}
              />
            </Card>
          </div>

          <div className="space-y-6">
            <Card
              title="Portfolio projection"
              subtitle={`${percent(annualReturn, 2)} blended return · ${horizonYears}-year horizon`}
              icon={<ChartSpline className="size-4 text-[var(--text-muted)]" />}
              action={
                <div
                  className="flex shrink-0 gap-1 rounded-lg border bg-[var(--surface-2)] p-0.5"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {[
                    { value: false, label: 'Nominal' },
                    { value: true, label: 'Real' },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      aria-pressed={realMode === option.value}
                      onClick={() => setRealMode(option.value)}
                      className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                      style={{
                        background:
                          realMode === option.value
                            ? 'var(--surface-raised)'
                            : 'transparent',
                        color:
                          realMode === option.value
                            ? 'var(--text-primary)'
                            : 'var(--text-secondary)',
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              }
            >
              <ProjectionChart
                years={simulation.years}
                startingBalance={startingBalance}
                inflationRate={inflationRate}
                realMode={realMode}
              />
              {simulation.deficitYears.length > 0 && (
                <p className="mt-3 text-xs text-[var(--status-critical)]">
                  {simulation.deficitYears.length} deficit{' '}
                  {simulation.deficitYears.length === 1 ? 'year' : 'years'} (
                  {simulation.deficitYears.slice(0, 6).join(', ')}
                  {simulation.deficitYears.length > 6 ? '…' : ''}) contributed
                  nothing.
                </p>
              )}
            </Card>

            <ProjectionSummary
              years={simulation.years}
              startingBalance={startingBalance}
              inflationRate={inflationRate}
              realMode={realMode}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

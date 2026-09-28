import { ChevronDown } from 'lucide-react'
import type { HousingTier } from '../../data/metroData'
import { HOUSING_TIERS, groupByRegion } from '../../data/metroData'
import { number, parseCurrency, usd } from '../../lib/format'
import { AnimatedNumber } from './motion'
import type { LandingModel } from './types'

export const SALARY_MIN = 20_000
export const SALARY_MAX = 500_000

const TIER_PHRASE: Record<HousingTier, string> = {
  roommate: 'with roommates',
  studio: 'in a studio',
  one_bed: 'in a one-bedroom',
  two_bed_solo: 'in a two-bedroom, solo',
}

const REGION_GROUPS = groupByRegion()

/* Inline controls look like the words of the sentence, with a hairline
   underline that says "this part is yours to change". */
const control =
  'inline-flex cursor-pointer items-baseline border-b border-[var(--ink)] pb-px text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus-within:border-[var(--accent)]'

const pickerSelect = 'absolute inset-0 size-full cursor-pointer appearance-none opacity-0'

/**
 * A select dressed as a word: the current choice is set as text and sizes
 * the control, and the real (invisible) select on top keeps native keyboard,
 * screen-reader and phone-picker behaviour.
 */
function Picker({ label, text, children }: { label: string; text: string; children: React.ReactNode }) {
  return (
    <label className={`${control} relative font-semibold`}>
      <span className="sr-only">{label}</span>
      <span aria-hidden>{text}</span>
      <ChevronDown aria-hidden className="ml-1 size-[0.6em] self-center opacity-50" />
      {children}
    </label>
  )
}

/**
 * The hero's input, written as a sentence: salary, city and rent are the
 * blanks, and the answer completes it. Native selects keep it fast and
 * familiar on phones.
 */
export function Sentence({
  model,
  kept,
  shortfall,
}: {
  model: LandingModel
  kept: number
  shortfall: number
}) {
  const { gross, metro, housingTier } = model
  const pctOfRange = ((Math.min(Math.max(gross, SALARY_MIN), SALARY_MAX) - SALARY_MIN) / (SALARY_MAX - SALARY_MIN)) * 100

  return (
    <div>
      <p className="text-[24px] font-medium leading-[1.45] tracking-[-0.02em] text-[var(--ink-2)] sm:text-[28px]">
        Earning{' '}
        <label className={`${control} relative font-semibold tabular-nums`}>
          <span className="sr-only">Gross annual salary</span>
          {/* The visible figure sizes the field; the input sits on top of it. */}
          <span aria-hidden className="invisible whitespace-pre">${number(gross)}</span>
          <span aria-hidden className="absolute left-0">$</span>
          <input
            inputMode="numeric"
            value={number(gross)}
            onChange={(e) => model.onGrossChange(parseCurrency(e.target.value))}
            className="absolute inset-y-0 left-[0.6em] right-0 w-[calc(100%-0.6em)] bg-transparent font-semibold tracking-[-0.02em] outline-none"
          />
        </label>{' '}
        a year in{' '}
        <span className="whitespace-nowrap">
          <Picker label="City" text={`${metro.city}, ${metro.stateCode}`}>
            <select
              value={metro.id}
              onChange={(e) => model.onMetroChange(e.target.value)}
              className={pickerSelect}
            >
              {REGION_GROUPS.map((g) => (
                <optgroup key={g.region} label={g.region}>
                  {g.metros.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.city}, {m.stateCode}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Picker>
          ,
        </span>{' '}
        living{' '}
        <span className="whitespace-nowrap">
          <Picker label="Housing" text={TIER_PHRASE[housingTier]}>
            <select
              value={housingTier}
              onChange={(e) => model.onHousingTierChange(e.target.value as HousingTier)}
              className={pickerSelect}
            >
              {HOUSING_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {TIER_PHRASE[tier]}
                </option>
              ))}
            </select>
          </Picker>
          ,
        </span>{' '}
        {shortfall > 0 ? (
          <>
            you come up{' '}
            <AnimatedNumber value={shortfall} format={usd} className="font-semibold text-[var(--status-critical)] tabular-nums" />{' '}
            short every month.
          </>
        ) : (
          <>
            you keep{' '}
            <AnimatedNumber value={kept} format={usd} className="font-semibold text-[var(--accent)] tabular-nums" />{' '}
            a month.
          </>
        )}
      </p>

      <div className="mt-6 max-w-md">
        <input
          type="range"
          min={SALARY_MIN}
          max={SALARY_MAX}
          step={1_000}
          value={Math.min(Math.max(gross, SALARY_MIN), SALARY_MAX)}
          onChange={(e) => model.onGrossChange(Number(e.target.value))}
          aria-label="Gross annual salary"
          aria-valuetext={`${usd(gross)} per year`}
          className="salary-range"
          style={{ ['--fill' as string]: `${pctOfRange}%` }}
        />
        <div className="mt-1.5 flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
          <span>$20k</span>
          <span>Drag salary</span>
          <span>$500k</span>
        </div>
      </div>
    </div>
  )
}

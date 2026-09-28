import type { ReactNode } from 'react'
import { CitySpectrum } from './CitySpectrum'
import { Hero } from './Hero'
import { CalculatorIntro, ScrollFillLine } from './Interludes'
import { PaycheckStory } from './PaycheckStory'
import type { LandingModel } from './types'
import { WealthHorizon } from './WealthHorizon'

const STORY_ID = 'paycheck-story'

/**
 * The front page: the hero, then the full calculator, then the story told
 * with the calculator's own numbers — where one paycheck goes, how that
 * changes by city, and what the difference becomes over time.
 */
export function LandingPage({ model, calculator }: { model: LandingModel; calculator: ReactNode }) {
  return (
    <div className="landing">
      <Hero model={model} storyId={STORY_ID} />
      <CalculatorIntro />
      {calculator}
      <PaycheckStory model={model} id={STORY_ID} />
      <ScrollFillLine text="A salary is a headline number. Where you live decides how much of it you actually keep." />
      <CitySpectrum model={model} />
      <WealthHorizon model={model} />
    </div>
  )
}

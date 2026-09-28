import { CitySpectrum } from './CitySpectrum'
import { Hero } from './Hero'
import { CityTicker, ScrollFillLine, WorkbenchIntro } from './Interludes'
import { PaycheckStory } from './PaycheckStory'
import type { LandingModel } from './types'
import { WealthHorizon } from './WealthHorizon'

const STORY_ID = 'paycheck-story'

/**
 * The front page, told as one story with the calculator's own numbers:
 * a salary, what takes it apart, how that changes by city, and what the
 * difference becomes over time — then the full calculator.
 */
export function LandingPage({ model }: { model: LandingModel }) {
  return (
    <div className="landing">
      <Hero model={model} storyId={STORY_ID} />
      <CityTicker model={model} />
      <PaycheckStory model={model} id={STORY_ID} />
      <ScrollFillLine text="A salary is a headline number. Where you live decides how much of it you actually keep." />
      <CitySpectrum model={model} />
      <WealthHorizon model={model} />
      <WorkbenchIntro />
    </div>
  )
}

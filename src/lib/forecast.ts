/**
 * Investment projection for the monthly surplus left after cost of living.
 *
 * Model: contributions are made at the START of each month and compound
 * monthly at `annualReturn / 12`. The contribution steps up once a year by
 * `annualRaise`. Alongside the nominal series, a real (inflation-adjusted)
 * series is reported in today's dollars, because a 20-year comparison
 * between metros is misleading in nominal terms alone.
 */

export interface ForecastInput {
  /** Balance already invested at year 0. */
  startingBalance: number
  /** Surplus invested each month at year 0. */
  monthlyContribution: number
  /** Nominal annual return, e.g. 0.07 for 7%. */
  annualReturn: number
  /** Annual inflation used to deflate the nominal series, e.g. 0.025. */
  inflationRate: number
  /** Annual increase to the contribution, e.g. 0.03. Defaults to 0. */
  annualRaise?: number
  years: number
}

export interface ForecastPoint {
  /** Years elapsed. Year 0 is the starting position. */
  year: number
  /** Cumulative out-of-pocket contributions, excluding starting balance. */
  contributions: number
  /** Portfolio value in that year's dollars. */
  nominal: number
  /** Portfolio value in year-0 dollars. */
  real: number
  /** nominal minus contributions minus startingBalance. */
  growth: number
}

/**
 * Project a portfolio year by year. Returns `years + 1` points so the
 * series starts at year 0, which charts cleanly.
 */
export function projectInvestment({
  startingBalance,
  monthlyContribution,
  annualReturn,
  inflationRate,
  annualRaise = 0,
  years,
}: ForecastInput): ForecastPoint[] {
  const monthlyRate = annualReturn / 12
  const points: ForecastPoint[] = []

  let balance = Math.max(0, startingBalance)
  let contributed = 0
  let contribution = Math.max(0, monthlyContribution)

  points.push({
    year: 0,
    contributions: 0,
    nominal: balance,
    real: balance,
    growth: 0,
  })

  for (let year = 1; year <= years; year += 1) {
    for (let month = 0; month < 12; month += 1) {
      balance += contribution
      contributed += contribution
      balance *= 1 + monthlyRate
    }

    points.push({
      year,
      contributions: contributed,
      nominal: balance,
      real: balance / (1 + inflationRate) ** year,
      growth: balance - contributed - Math.max(0, startingBalance),
    })

    contribution *= 1 + annualRaise
  }

  return points
}

/**
 * Monthly surplus available to invest. Negative means the metro's baseline
 * cost of living exceeds take-home pay at that salary.
 */
export function monthlySurplus(
  netMonthlyPay: number,
  monthlyCost: number,
): number {
  return netMonthlyPay - monthlyCost
}

/** Share of take-home pay left over after baseline cost of living. */
export function savingsRate(
  netMonthlyPay: number,
  monthlyCost: number,
): number {
  if (netMonthlyPay <= 0) return 0
  return (netMonthlyPay - monthlyCost) / netMonthlyPay
}

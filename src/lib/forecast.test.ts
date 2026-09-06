import { describe, expect, it } from 'vitest'
import { monthlySurplus, projectInvestment, savingsRate } from './forecast'

describe('projectInvestment', () => {
  it('returns years + 1 points, starting at year 0', () => {
    const points = projectInvestment({
      startingBalance: 1_000,
      monthlyContribution: 500,
      annualReturn: 0.07,
      inflationRate: 0.025,
      years: 20,
    })
    expect(points).toHaveLength(21)
    expect(points[0]).toMatchObject({
      year: 0,
      contributions: 0,
      nominal: 1_000,
      real: 1_000,
    })
  })

  it('matches a hand-computed annuity-due future value', () => {
    // $100/month at 1% monthly for 12 months, contributed at period start:
    //   100 * (((1.01^12) - 1) / 0.01) * 1.01 = 1280.9328...
    const [, end] = projectInvestment({
      startingBalance: 0,
      monthlyContribution: 100,
      annualReturn: 0.12,
      inflationRate: 0,
      years: 1,
    })
    expect(end.nominal).toBeCloseTo(1_280.9328, 3)
    expect(end.contributions).toBeCloseTo(1_200, 6)
  })

  it('deflates the real series by inflation', () => {
    const [, end] = projectInvestment({
      startingBalance: 0,
      monthlyContribution: 1_000,
      annualReturn: 0.07,
      inflationRate: 0.025,
      years: 1,
    })
    expect(end.real).toBeCloseTo(end.nominal / 1.025, 6)
    expect(end.real).toBeLessThan(end.nominal)
  })

  it('leaves real equal to nominal when inflation is zero', () => {
    const points = projectInvestment({
      startingBalance: 5_000,
      monthlyContribution: 250,
      annualReturn: 0.06,
      inflationRate: 0,
      years: 10,
    })
    for (const point of points) {
      expect(point.real).toBeCloseTo(point.nominal, 6)
    }
  })

  it('reports growth as value net of contributions and starting balance', () => {
    const points = projectInvestment({
      startingBalance: 2_000,
      monthlyContribution: 400,
      annualReturn: 0.08,
      inflationRate: 0.02,
      years: 15,
    })
    const last = points[points.length - 1]
    expect(last.growth).toBeCloseTo(last.nominal - last.contributions - 2_000, 6)
    expect(last.growth).toBeGreaterThan(0)
  })

  it('contributes more over time when an annual raise is applied', () => {
    const flat = projectInvestment({
      startingBalance: 0,
      monthlyContribution: 500,
      annualReturn: 0.07,
      inflationRate: 0.025,
      years: 10,
    })
    const raised = projectInvestment({
      startingBalance: 0,
      monthlyContribution: 500,
      annualReturn: 0.07,
      inflationRate: 0.025,
      annualRaise: 0.03,
      years: 10,
    })
    expect(raised[10].contributions).toBeGreaterThan(flat[10].contributions)
    expect(raised[10].nominal).toBeGreaterThan(flat[10].nominal)
    // The raise only takes effect after year 1, so year 1 must match.
    expect(raised[1].nominal).toBeCloseTo(flat[1].nominal, 6)
  })

  it('grows a starting balance even with no contributions', () => {
    const [, end] = projectInvestment({
      startingBalance: 10_000,
      monthlyContribution: 0,
      annualReturn: 0.12,
      inflationRate: 0,
      years: 1,
    })
    expect(end.nominal).toBeCloseTo(10_000 * 1.01 ** 12, 6)
    expect(end.contributions).toBe(0)
  })

  it('treats a negative surplus as zero rather than draining the balance', () => {
    const [, end] = projectInvestment({
      startingBalance: 1_000,
      monthlyContribution: -500,
      annualReturn: 0,
      inflationRate: 0,
      years: 1,
    })
    expect(end.nominal).toBe(1_000)
  })
})

describe('monthlySurplus and savingsRate', () => {
  it('reports what is left after cost of living', () => {
    expect(monthlySurplus(6_000, 4_500)).toBe(1_500)
    expect(savingsRate(6_000, 4_500)).toBeCloseTo(0.25, 6)
  })

  it('goes negative when cost of living exceeds take-home', () => {
    expect(monthlySurplus(4_000, 5_200)).toBe(-1_200)
    expect(savingsRate(4_000, 5_200)).toBeCloseTo(-0.3, 6)
  })

  it('avoids dividing by zero at zero pay', () => {
    expect(savingsRate(0, 3_000)).toBe(0)
  })
})

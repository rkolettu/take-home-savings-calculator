import {
  FEDERAL_BRACKETS,
  FEDERAL_STANDARD_DEDUCTION,
  FICA,
  STATE_TAX,
} from '../data/taxTables'
import type { ByFilingStatus, FilingStatus, TaxBracket } from '../data/types'

/**
 * Pure 2026 tax math. No data literals live here — every figure comes from
 * `../data/taxTables`, so updating a bracket never means touching logic.
 *
 * Scope: employee W-2 wage income only. Not modelled: itemized deductions,
 * credits, pre-tax retirement or HSA contributions, self-employment tax,
 * capital gains, AMT, or the NIIT.
 */

/**
 * Apply a marginal bracket table to an already-deducted taxable income.
 * Brackets must be sorted ascending, with `Infinity` as the final `upTo`.
 */
export function applyBrackets(
  taxableIncome: number,
  brackets: TaxBracket[],
): number {
  if (taxableIncome <= 0) return 0

  let tax = 0
  let lowerBound = 0

  for (const bracket of brackets) {
    if (taxableIncome <= lowerBound) break
    const amountInBracket = Math.min(taxableIncome, bracket.upTo) - lowerBound
    tax += amountInBracket * bracket.rate
    lowerBound = bracket.upTo
  }

  return tax
}

/** The rate applied to the next dollar of taxable income. */
export function marginalRateFor(
  taxableIncome: number,
  brackets: TaxBracket[],
): number {
  if (taxableIncome <= 0) return 0
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.upTo) return bracket.rate
  }
  return brackets[brackets.length - 1].rate
}

export function federalTaxableIncome(
  gross: number,
  filingStatus: FilingStatus,
): number {
  return Math.max(0, gross - FEDERAL_STANDARD_DEDUCTION[filingStatus])
}

export function federalIncomeTax(
  gross: number,
  filingStatus: FilingStatus,
): number {
  return applyBrackets(
    federalTaxableIncome(gross, filingStatus),
    FEDERAL_BRACKETS[filingStatus],
  )
}

export interface FicaBreakdown {
  socialSecurity: number
  medicare: number
  total: number
}

/**
 * Employee-side FICA. Social Security stops at the annual wage base;
 * Medicare does not, and gains an extra 0.9% above a statutory threshold.
 */
export function ficaTax(
  gross: number,
  filingStatus: FilingStatus,
): FicaBreakdown {
  const wages = Math.max(0, gross)

  const socialSecurity =
    Math.min(wages, FICA.socialSecurityWageBase) * FICA.socialSecurityRate

  const additionalMedicareWages = Math.max(
    0,
    wages - FICA.additionalMedicareThreshold[filingStatus],
  )
  const medicare =
    wages * FICA.medicareRate +
    additionalMedicareWages * FICA.additionalMedicareRate

  return { socialSecurity, medicare, total: socialSecurity + medicare }
}

/**
 * State income tax for a two-letter state code. Unknown codes are treated
 * as no-tax rather than throwing, so an unmapped metro degrades gracefully.
 */
export function stateIncomeTax(
  gross: number,
  filingStatus: FilingStatus,
  stateCode: string,
): number {
  const spec = STATE_TAX[stateCode]
  if (!spec || spec.kind === 'none') return 0

  const taxable = Math.max(
    0,
    gross -
      spec.standardDeduction[filingStatus] -
      spec.personalExemption[filingStatus],
  )

  if (spec.kind === 'flat') return taxable * spec.rate
  return applyBrackets(taxable, spec.brackets[filingStatus])
}

/** Resident wage tax on gross, or only the amount above a metro threshold. */
export function localIncomeTax(gross: number, localRate = 0, threshold = 0): number {
  return Math.max(0, gross - threshold) * localRate
}

export interface TakeHomeBreakdown {
  gross: number
  federal: number
  state: number
  local: number
  socialSecurity: number
  medicare: number
  /** federal + state + local + FICA */
  totalTax: number
  /** Annual take-home pay. */
  net: number
  netMonthly: number
  /** totalTax / gross */
  effectiveRate: number
  /** Federal marginal rate on the next dollar. */
  federalMarginalRate: number
}

export interface TakeHomeInput {
  gross: number
  filingStatus: FilingStatus
  stateCode: string
  /** Resident local income tax rate, from the metro record. */
  localIncomeTaxRate?: number
  localIncomeTaxThreshold?: ByFilingStatus<number>
}

/** Full annual take-home computation for one salary in one jurisdiction. */
export function computeTakeHome({
  gross,
  filingStatus,
  stateCode,
  localIncomeTaxRate = 0,
  localIncomeTaxThreshold,
}: TakeHomeInput): TakeHomeBreakdown {
  const safeGross = Math.max(0, gross)

  const federal = federalIncomeTax(safeGross, filingStatus)
  const state = stateIncomeTax(safeGross, filingStatus, stateCode)
  const local = localIncomeTax(safeGross, localIncomeTaxRate, localIncomeTaxThreshold?.[filingStatus])
  const { socialSecurity, medicare } = ficaTax(safeGross, filingStatus)

  const totalTax = federal + state + local + socialSecurity + medicare
  const net = safeGross - totalTax

  return {
    gross: safeGross,
    federal,
    state,
    local,
    socialSecurity,
    medicare,
    totalTax,
    net,
    netMonthly: net / 12,
    effectiveRate: safeGross > 0 ? totalTax / safeGross : 0,
    federalMarginalRate: marginalRateFor(
      federalTaxableIncome(safeGross, filingStatus),
      FEDERAL_BRACKETS[filingStatus],
    ),
  }
}

import type { Metro } from '../data/types'
import { percent, usd } from './format'
import type { SimulationResult, SimulationYear } from './simulation'

/** Clipboard summary and CSV export of the projection table. */

const CSV_COLUMNS = [
  'Year',
  'Metro',
  'Gross salary',
  'Net take-home',
  'Annual expenses',
  'Annual surplus',
  'Invested',
  'Cumulative contributions',
  'Investment growth',
  'Nominal balance',
  'Real balance',
  'Events',
] as const

/**
 * RFC 4180 escaping: wrap in quotes when the value contains a comma, quote
 * or newline, and double any embedded quotes. Metro labels always contain a
 * comma, so this is load-bearing rather than defensive.
 */
export function escapeCsvCell(value: string): string {
  if (!/[",\r\n]/.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
}

function round(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2)
}

export function buildCsv(result: SimulationResult): string {
  const rows = result.years.map((row: SimulationYear) =>
    [
      String(row.year),
      row.metroLabel,
      round(row.grossSalary),
      round(row.netTakeHome),
      round(row.annualExpenses),
      round(row.annualSurplus),
      round(row.invested),
      round(row.cumulativeContributions),
      round(row.growth),
      round(row.nominalBalance),
      round(row.realBalance),
      row.events.join('; '),
    ]
      .map(escapeCsvCell)
      .join(','),
  )

  return [CSV_COLUMNS.join(','), ...rows].join('\r\n')
}

export interface SummaryInput {
  metro: Metro
  gross: number
  netMonthly: number
  monthlyCost: number
  surplus: number
  savingsRate: number
  effectiveTaxRate: number
  annualReturn: number
  wageGrowth: number
  inflationRate: number
  startingBalance: number
  result: SimulationResult
}

/** Plain-text summary for the clipboard. */
export function buildSummaryText({
  metro,
  gross,
  netMonthly,
  monthlyCost,
  surplus,
  savingsRate,
  effectiveTaxRate,
  annualReturn,
  wageGrowth,
  inflationRate,
  startingBalance,
  result,
}: SummaryInput): string {
  const horizon = result.years[result.years.length - 1]
  const checkpoints = [5, 10, 20, 30].filter((year) => year <= horizon.year)

  const lines = [
    `Take-Home Savings Calculator — ${metro.city}, ${metro.stateCode}`,
    '',
    'TODAY',
    `  Gross salary            ${usd(gross)}/yr`,
    `  Net take-home           ${usd(netMonthly)}/mo`,
    `  Cost of living          ${usd(monthlyCost)}/mo`,
    `  Monthly surplus         ${usd(surplus)}`,
    `  Savings rate            ${percent(savingsRate)}`,
    `  Effective tax rate      ${percent(effectiveTaxRate)}`,
    '',
    'ASSUMPTIONS',
    `  Wage growth             ${percent(wageGrowth)}/yr`,
    `  Inflation               ${percent(inflationRate)}/yr`,
    `  Blended return          ${percent(annualReturn, 2)}/yr`,
    `  Starting balance        ${usd(startingBalance)}`,
    `  Horizon                 ${horizon.year} years`,
    '',
    'PROJECTION',
  ]

  for (const year of checkpoints) {
    const row = result.years[year]
    lines.push(
      `  Year ${String(year).padEnd(2)}  ${usd(row.nominalBalance).padStart(12)} nominal  ${usd(row.realBalance).padStart(12)} real  (cash flow ${usd(row.annualSurplus)}/yr, ${row.metroLabel})`,
    )
  }

  if (result.deficitYears.length > 0) {
    lines.push(
      '',
      `  Deficit years (nothing invested): ${result.deficitYears.join(', ')}`,
    )
  }

  return lines.join('\n')
}

/**
 * Copies text to the clipboard.
 *
 * The async Clipboard API is the right tool but is denied outright in
 * plenty of real contexts — insecure origins, embedded browsers, and
 * permission policies that block clipboard-write. The legacy
 * `execCommand('copy')` path still works in most of those, so it is worth
 * the fallback rather than showing the user a dead button.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    /* Fall through to the legacy path. */
  }

  if (typeof document === 'undefined') return false

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    // Keep it off-screen but still focusable, which execCommand requires.
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '-1000px'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    textarea.remove()
    return ok
  } catch {
    return false
  }
}

/** Triggers a client-side file download. Returns false if unsupported. */
export function downloadCsv(csv: string, filename: string): boolean {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return false
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
  return true
}

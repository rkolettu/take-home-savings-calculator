/** Display formatters. Kept apart from the math so rounding is a view concern. */

const usdWhole = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const plain = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/** `$4,208` — the default for money on screen. */
export function usd(value: number): string {
  return usdWhole.format(Math.round(value))
}

/** `$4.2M` — for values that would otherwise blow out a stat tile. */
export function usdShort(value: number): string {
  return Math.abs(value) >= 100_000 ? usdCompact.format(value) : usd(value)
}

/** `4,208` — no symbol, for inputs. */
export function number(value: number): string {
  return plain.format(Math.round(value))
}

/** `24.1%` from a 0–1 ratio. */
export function percent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`
}

/** Digits only, for parsing a typed currency field back to a number. */
export function parseCurrency(raw: string): number {
  const digits = raw.replace(/[^0-9]/g, '')
  return digits === '' ? 0 : Number(digits)
}

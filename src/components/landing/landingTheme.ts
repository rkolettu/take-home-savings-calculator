/**
 * The landing page's colour story, kept to the portfolio / EDGAR family:
 * parchment and ink, one blue for what you keep, and earthy tones for what
 * leaves. Canvas needs raw RGB; the CSS mirrors live in index.css.
 */
import type { PaycheckGroupKey } from '../../lib/paycheck'

type RGB = [number, number, number]

const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]

export const INK = hex('#171717')

/** Each group's swatch, then one tone per part so sub-items read as strata. */
export const GROUP_TONES: Record<PaycheckGroupKey | 'shortfall', { swatch: string; parts: RGB[] }> = {
  tax: { swatch: '#aaa398', parts: ['#9d968b', '#aea79c', '#bfb9ae'].map(hex) },
  housing: { swatch: '#c0643c', parts: ['#c0643c'].map(hex) },
  living: {
    swatch: '#c9985e',
    parts: ['#b98650', '#c49461', '#cda271', '#d5ae80'].map(hex),
  },
  kept: { swatch: '#1d4ed8', parts: ['#1d4ed8'].map(hex) },
  shortfall: { swatch: '#b64141', parts: ['#b64141'].map(hex) },
}

/** Short names drawn over the dots, where space is tight. */
export const FIELD_LABELS: Record<PaycheckGroupKey | 'shortfall', string> = {
  tax: 'Taxes',
  housing: 'Rent',
  living: 'Living',
  kept: 'Kept',
  shortfall: 'Short',
}

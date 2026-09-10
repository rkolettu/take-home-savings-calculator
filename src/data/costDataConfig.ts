/**
 * One-switch rollback for externally indexed living-cost data.
 *
 * Set this to false to make every calculator/compare cost immediately fall
 * back to the original hand-built metro benchmarks in `metros.ts` without
 * deleting generated data or changing the updater.
 */
// Off: July 2026 is both the source base and latest period, so the housing
// index cannot repair incorrect rent levels. Re-enable only after validated
// per-metro 1BR drift is populated over the August 2026 asking-rent anchors
// and at least one housing multiplier differs meaningfully from 1.0.
export const USE_AUTOMATIC_COST_UPDATES = false

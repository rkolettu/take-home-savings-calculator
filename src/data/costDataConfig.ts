/**
 * One-switch rollback for externally indexed living-cost data.
 *
 * Set this to false to make every calculator/compare cost immediately fall
 * back to the original hand-built metro benchmarks in `metros.ts` without
 * deleting generated data or changing the updater.
 */
export const USE_AUTOMATIC_COST_UPDATES = true

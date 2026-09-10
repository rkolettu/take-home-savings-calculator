/**
 * One-switch rollback for externally indexed living-cost data.
 *
 * Disabled because the current sourced layer is a ratio index anchored to its
 * base period: it can track later drift, but it cannot correct a wrong starting
 * level. Re-enable only after the source data advances beyond the base period
 * and the benchmark levels/provenance have been independently validated.
 */
// Off: July 2026 is both the source base and latest period, so the housing
// index cannot repair incorrect rent levels. Re-enable only after validated
// per-metro 1BR drift is populated over the August 2026 asking-rent anchors
// and at least one housing multiplier differs meaningfully from 1.0.
export const USE_AUTOMATIC_COST_UPDATES = false

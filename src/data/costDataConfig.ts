/**
 * One-switch rollback for externally indexed living-cost data.
 *
 * Disabled because the current sourced layer is a ratio index anchored to its
 * base period: it can track later drift, but it cannot correct a wrong starting
 * level. Re-enable only after the source data advances beyond the base period
 * and the benchmark levels/provenance have been independently validated.
 */
export const USE_AUTOMATIC_COST_UPDATES = false

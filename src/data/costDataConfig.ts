/**
 * One-switch rollback for externally indexed living-cost data.
 *
 * Disabled because the current sourced layer is a ratio index anchored to its
 * base period: it can track later drift, but it cannot correct a wrong starting
 * level. Re-enable only after the source data advances beyond the base period
 * and the benchmark levels/provenance have been independently validated.
 */
// Off until a HUD year later than the FY2027 anchor produces validated
// per-metro 1BR drift over the August 2026 asking-rent benchmarks and at least
// one housing multiplier differs meaningfully from 1.0.
export const USE_AUTOMATIC_COST_UPDATES = false

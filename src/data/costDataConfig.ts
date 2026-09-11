/**
 * HUD housing drift is safe to apply automatically because it is a bounded
 * per-metro ratio over the verified FY2027 HUD Fair Market Rent anchor.
 * FY2027 currently produces 1.0 multipliers, so enabling this does not change
 * today's August 2026 asking-rent benchmarks. A later validated HUD year can
 * move those anchors automatically without a manual code switch.
 */
export const USE_AUTOMATIC_HOUSING_UPDATES = true

/**
 * Other sourced living-cost adjustments remain opt-in. Keeping this separate
 * prevents HUD housing automation from also changing utilities, groceries,
 * transport, or discretionary spending.
 */
export const USE_AUTOMATIC_NON_HOUSING_UPDATES = false

/** Backward-compatible alias for older imports. */
export const USE_AUTOMATIC_COST_UPDATES = USE_AUTOMATIC_NON_HOUSING_UPDATES

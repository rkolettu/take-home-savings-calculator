/**
 * HUD housing drift is safe to apply automatically because it is a bounded
 * per-metro ratio over the verified FY2027 HUD Fair Market Rent anchor.
 * FY2027 currently produces 1.0 multipliers, so enabling this does not change
 * today's August 2026 asking-rent benchmarks. A later validated HUD year can
 * move those anchors automatically without a manual code switch.
 */
export const USE_AUTOMATIC_HOUSING_UPDATES = true

/**
 * EIA electricity is enabled on its own because it is the one non-housing
 * source that is fully reproducible: `scripts/refresh-eia-electricity.py`
 * regenerates every state bill from the published EIA workbook, the
 * single-renter and non-electric shares are explicit in generated data, and
 * the result is clamped to half-to-double the original metro benchmark.
 *
 * Keeping this separate from the remaining categories means utilities can
 * track a real public source without also applying the grocery, transport,
 * and discretionary multipliers, which have no generator behind them.
 */
export const USE_AUTOMATIC_UTILITY_UPDATES = true

/**
 * Groceries, transport, and discretionary adjustments remain opt-in. Their
 * multipliers in `sourcedCosts.json` are static values that no script in this
 * repository can regenerate or verify, so they stay off until one exists.
 */
export const USE_AUTOMATIC_NON_HOUSING_UPDATES = false

/** Backward-compatible alias for older imports. */
export const USE_AUTOMATIC_COST_UPDATES = USE_AUTOMATIC_NON_HOUSING_UPDATES

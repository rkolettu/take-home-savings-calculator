# EIA utility methodology

The calculator keeps the original metro utility benchmarks intact and applies a reversible sourced layer on top. `USE_AUTOMATIC_UTILITY_UPDATES` in `costDataConfig.ts` is the single switch; turning it off returns the utilities line to the exact original metro benchmark.

Electricity uses the U.S. Energy Information Administration's residential average monthly bill by state. Because EIA's figure reflects an average residential customer rather than one renter, the generated data applies an explicit single-renter factor. Water, gas, trash, and home internet remain modeled from the existing metro utility benchmark.

## The price escalator

`priceInflationMultiplier` carries the published bills forward from their workbook year to the app's price period, so it is valid for exactly one `billPeriod`. The period it was derived against is recorded alongside it as `priceInflationBasePeriod`, and the application applies the escalator only when the two match.

This makes double-inflation structurally impossible. When a refresh pulls a newer workbook, the bills already reflect the newer prices; `scripts/refresh-eia-electricity.py` resets the multiplier to 1.0 and records the new base period, and the application uses the freshly published bills as-is until a new escalator is derived.

## Failure behavior

If the EIA download is unavailable or fails validation, the script exits zero and the last known good generated values remain in the repository. At runtime, a missing or malformed electricity block, or a state with no published bill, falls back to that metro's own benchmark. The final result is clamped to between half and double the original benchmark, so no upstream value can produce a wild jump.

## What is not sourced

The `categoryMultipliers` values for groceries, transport, and discretionary are static numbers that no script in this repository regenerates. They are gated behind the separate `USE_AUTOMATIC_NON_HOUSING_UPDATES` flag and remain off until a generator exists for them.

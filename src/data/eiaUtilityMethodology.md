# EIA utility methodology

The calculator keeps the original metro utility benchmarks intact and applies a reversible sourced layer on top.

Electricity uses the U.S. Energy Information Administration's residential average monthly bill by state. Because EIA's figure reflects an average residential customer rather than one renter, the generated data applies an explicit single-renter factor. Water, gas, trash, and home internet remain modeled from the existing metro utility benchmark and are inflation-indexed.

If the EIA download is unavailable or fails validation, the last known good generated values remain in the repository. If automatic cost updates are disabled, the calculator returns to the original metro benchmarks exactly.

# Take-Home Savings Calculator

An interactive single-page app for modelling what a US salary actually leaves
you with. Pick a metro, enter a gross salary, and it computes take-home pay
after 2026 federal, state, local and FICA tax, subtracts a cost-of-living
basket you can edit line by line, and projects the resulting surplus forward
up to 30 years with career and lifestyle milestones along the way.

Everything runs in the browser. There is no backend, no account, and no
network call — your inputs never leave the page.

## Features

- **45 US metros** across six regions, each with cost-of-living benchmarks and
  its own state and local tax treatment.
- **Four housing tiers** per metro — roommate share, studio, 1-bed, 2-bed solo
  — so a new grad splitting a 3-bed and someone renting alone are both
  representable.
- **Full progressive tax engine**: 2026 federal brackets by filing status,
  FICA with the Social Security wage base and Additional Medicare surtax,
  per-state brackets or flat rates (including the five states with no wage
  income tax), and resident municipal taxes in 13 metros.
- **Life milestones**: salary steps, relocations, housing-tier switches,
  explicit rent changes, and recurring expense deltas, each applying from a
  chosen year forward.
- **Investment projection** with editable vehicle returns, a custom
  allocation blend, and a real-versus-nominal toggle.
- **Local persistence** — your inputs survive a refresh — plus CSV export of
  the full projection table and a clipboard summary.

## Tech stack

| | |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 (Rolldown) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first config) |
| Charts | Recharts |
| Icons | lucide-react |
| Tests | Vitest |
| Lint | oxlint |

The entire data and math layer is framework-agnostic: nothing under
`src/data/` or `src/lib/` imports React, so all of it is unit-testable in
isolation.

## Getting started

```bash
npm install
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with HMR at `http://localhost:5173` |
| `npm test` | Full Vitest suite |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | oxlint |
| `npm run build` | Typecheck then production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |

## Deployment

The build is a fully static bundle — any static host works, and no SPA
rewrite rules are needed because the app has no client-side router.

**Vercel, Netlify, Cloudflare Pages, or any root-domain host.** Build command
`npm run build`, output directory `dist`. No configuration needed.

**GitHub Pages**, or anywhere the site is served from a subdirectory, needs
the public base path set at build time:

```bash
VITE_BASE_PATH=/your-repo-name/ npm run build
```

The trailing slash is required — `/your-repo` resolves siblings of `your-repo`
rather than children of it.

Output is split into three cached chunks (app, React, charts) so that
shipping app changes does not invalidate the vendor code in visitors'
browsers.

## Financial methodology

### Take-home pay

Gross wages are reduced by, in order:

1. **Federal income tax** — 2026 marginal brackets for single, married filing
   jointly, and head of household, applied to income after the 2026 standard
   deduction ($16,100 / $32,200 / $24,150). These are published 2026 figures.
2. **FICA** — 6.2% Social Security up to the $184,500 wage base, plus 1.45%
   Medicare with no cap and the additional 0.9% surtax above the statutory
   threshold ($200,000 single, $250,000 joint).
3. **State income tax** — a per-state spec that is progressive brackets, a
   flat rate, or none. Filing-status-specific brackets, standard deductions
   and personal exemptions are modelled where a state has them.
4. **Local income tax** — a resident municipal or county wage tax in the 13
   metros that levy one (New York City, Philadelphia, Pittsburgh, Baltimore,
   Wilmington, Detroit, Columbus, Cincinnati, Cleveland, Indianapolis,
   St. Louis, Kansas City, Portland). These are flat-on-gross approximations
   except where a filing-status threshold is explicitly modelled; Portland's
   local tax is applied only to income above its configured threshold.

### Data provenance and confidence

Every state spec carries a `vintage` and a `confidence` field, surfaced in the
UI when you expand the deduction breakdown:

- `published-2026` — an official 2026 schedule or current-year calculation
  method has been published.
- `carried-from-2025` — the most recent known value is carried forward as an
  estimate.

Where a spec makes a deliberate simplification, the `note` field says so and
says which direction it errs. Known limitations intentionally left in this
pass include Connecticut's and Wisconsin's income-tested deductions being
modelled as zero, which overstates tax at lower incomes; Utah's taxpayer
credit being unmodelled, which also overstates tax at lower and middle
incomes; Ohio work-city credits being assumed away; Maryland modelling only
Baltimore City rather than all 24 local jurisdictions; and New York City's
resident tax being approximated as a flat 3.76% instead of the actual
3.078%–3.876% progressive range.

### Housing benchmarks

Each metro is anchored on a one-bedroom rent benchmark. For August 2026, the
1BR anchors use median asking rents from a single-source market benchmark for
40 covered metros. The five uncovered metros — Stamford, Hartford,
Wilmington, Palm Beach, and Naples — use the prior hand benchmark multiplied
by 0.8829, the mean new-to-old ratio across the 40 covered metros, and are
explicitly marked `interpolated` in the data and UI.

The other three housing tiers are derived from the 1BR anchor so that the 45
metros stay in proportion with each other:

| Tier | Share of 1BR |
|---|---|
| Roommate (per-person share of a 2–3 bed) | 55–60%, varying by market |
| Studio | 85% |
| 1-bed | anchor |
| 2-bed solo | 135% |

The roommate share widens with market cost — where rent is high, people share
larger units and split further — so it is 55% in expensive metros and 60% in
cheaper ones. Any metro can override any tier explicitly.

Utilities, groceries, transportation, and discretionary spending remain
modelled metro benchmark estimates. A generated sourced-cost indexing layer
is retained in the repository but disabled because an index ratio can track
future drift without independently validating a starting price level.

### Dynamic cash flow and compounding

The projection is not a single fixed contribution compounded forward. Each
year is recomputed from scratch:

1. Salary grows at the baseline wage-growth rate, or resets to a salary
   milestone and resumes growing from there.
2. The cost basket is resolved for that year — the base metro, or a
   destination metro after a relocation, with any housing-tier switch, rent
   override, and cumulative expense deltas applied.
3. Tax is recomputed against whichever state and local jurisdiction applies
   that year.
4. The resulting surplus is contributed monthly and compounded at the blended
   return.

Conventions, all deliberate and covered by tests:

- **Dollars.** Every user-supplied amount is stated in the dollars of the year
  it takes effect and inflates from there; the base basket takes effect in
  year 1. Salary is the exception — it is nominal, because a salary is
  negotiated as a headline number.
- **Inflation drives both** the real-dollar deflation of the portfolio and the
  growth of the cost basket. Setting it to zero freezes costs and makes the
  real/nominal toggle a no-op.
- **A relocation re-seeds the whole basket** from the destination metro's
  benchmarks, discarding manual edits, and switches the tax jurisdiction.
- **A deficit year contributes zero** rather than draining the portfolio. The
  negative surplus is still reported, flagged in the chart tooltip and
  counted in a banner beneath it.
- **Compounding** is monthly, with contributions applied at the start of each
  month.

### Investments

Three vehicles with editable expected nominal returns — cash/HYSA, CD ladder
/ fixed, and a broad equity index — blended by weight. Weights are held as raw
numbers and normalised into shares, so dragging one slider never silently
rewrites the others. Presets cover 100% of each vehicle plus a balanced mix.

## Data caveat

**This tool is for exploration, not for filing or for financial advice.**

The August 2026 one-bedroom rent anchors are market benchmark estimates: 40
metros are directly covered by the cited single-source median asking-rent
benchmark and five are interpolated as described above. The remaining
cost-of-living categories are modelled estimates assembled to be directionally
useful and internally consistent for metro comparison; no individual utility,
grocery, transportation, or discretionary figure should be quoted as an
authoritative statistic.

Not modelled anywhere: many tax credits and phase-outs, itemised deductions,
pre-tax retirement or HSA contributions, employer matching, self-employment
tax, capital gains, AMT, the NIIT, and state millionaire surtaxes. Specific
known state/local simplifications are listed under Data provenance and
confidence above.

## Project structure

```
src/
  data/
    types.ts        Domain types: filing status, regions, housing tiers, metros
    metros.ts       45 metro benchmarks; housing tiers derived from the 1BR anchor
    taxTables.ts    2026 federal brackets, FICA constants, jurisdiction specs
    metroData.ts    Public barrel — components import from here
  lib/
    tax.ts          Pure bracket / FICA / state / local math
    simulation.ts   Year-by-year cash flow and portfolio engine
    forecast.ts     Fixed-contribution projection and savings-rate helpers
    costs.ts        Cost categories and the editable budget shape
    milestones.ts   Timeline event types and descriptions
    vehicles.ts     Allocation blending
    persistence.ts  Validated localStorage round-trip
    exportSummary.ts  CSV and clipboard export
    format.ts       Display formatters
  components/       React UI, one concern per file
```

## Testing

```bash
npm test
```

The tests cover bracket math against hand-computed values, wage-base and
surtax thresholds, state-spec shape and plausibility, housing data and tier
derivation, local-tax thresholds, simulation accounting identities,
milestone precedence rules, CSV escaping, and persistence against corrupt or
hand-edited storage.

The simulation suite includes a cross-check asserting that the year-by-year
engine agrees with the simpler fixed-contribution projection to four decimal
places when nothing varies year to year.

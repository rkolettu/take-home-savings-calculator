# Take-Home Savings Calculatorm (Built with Claude)

An interactive single-page web application for modeling what a US salary actually leaves you with. Pick a metro, enter a gross salary, and it computes take-home pay after 2026 federal, state, local, and FICA taxes, subtracts an editable cost-of-living basket, and projects the resulting surplus forward up to 30 years with career and lifestyle milestones.

Everything runs entirely client-side in the browser. There is no backend, no account creation, and zero network tracking — your financial data never leaves your device.

---

## Key Features

* **45 US Metros Across 6 Regions:** Curated metropolitan areas with localized cost-of-living benchmarks and state/municipal tax treatments.
* **4 Housing Tiers per Metro:** Roommate share, studio, 1-bed, and 2-bed solo — realistically modeling living arrangements from recent grads to established renters.
* **Full Progressive Tax Engine:** 2026 federal brackets by filing status, FICA (Social Security wage-base cap + Additional Medicare surtax), state-level brackets/flat rates, and resident municipal income taxes across 13 cities.
* **Career & Life Milestones:** Model future salary steps, geographic relocations, housing tier transitions, and custom recurring expense deltas.
* **Investment Projection Engine:** Compounding simulator supporting cash/HYSA, CD ladders, broad equity index funds, a customizable blended asset allocation, and an inflation toggle (real vs. nominal returns).
* **Local Persistence & Export:** Automatically saves scenarios to `localStorage` and provides 1-click RFC-4180 CSV export and clipboard summaries.

---

## Tech Stack

| Component | Technology |
| :--- | :--- |
| **Framework** | React 19 + TypeScript |
| **Build Tool** | Vite 8 (Rolldown) |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite`) |
| **Visualizations** | Recharts |
| **Icons** | Lucide React |
| **Testing** | Vitest (138 unit tests) |
| **Linter** | oxlint |

> The data and calculation layer is completely framework-agnostic. Files under `src/data/` and `src/lib/` do not import React and are tested in isolation.

---

## Getting Started

### Installation & Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs the Vite dev server at `http://localhost:5173` |
| `npm test` | Runs the full Vitest suite (138 tests) |
| `npm run typecheck` | Typechecks the codebase (`tsc -b --noEmit`) |
| `npm run lint` | Lints files with oxlint |
| `npm run build` | Compiles production assets into `dist/` |
| `npm run preview` | Locally serves the built production bundle |

---

## Financial Methodology

### 1. Take-Home Pay Deduction Order
Gross wages are reduced sequentially by:
1. **Federal Income Tax:** 2026 marginal brackets (Single, Married Filing Jointly, Head of Household) applied after the 2026 standard deduction ($16,100 / $32,200 / $24,150).
2. **FICA:** 6.2% Social Security up to the $184,500 wage base, plus 1.45% Medicare (uncapped) and the 0.9% Additional Medicare surtax above statutory thresholds ($200k Single / $250k Joint).
3. **State Income Tax:** State-specific tax specifications (progressive brackets, flat rate, or zero-tax states).
4. **Local / Municipal Tax:** Resident wage taxes modeled for 13 specific cities (e.g., NYC, Philadelphia, Baltimore, Detroit, St. Louis).

### 2. Housing Tiers
Benchmarks anchor on the metro's 1-bedroom rent:
* **Roommate Share:** 55%–60% of 1BR (scaled by market tier to reflect multi-bed splits).
* **Studio (0-BR):** 85% of 1BR.
* **1-Bedroom:** Anchor benchmark.
* **2-Bedroom Solo:** 135% of 1BR.

### 3. Dynamic Compounding & Milestones
* **Surplus:** Monthly Surplus = Net Monthly Pay - Total Monthly Living Expenses
* **Deficit Rule:** Deficit years contribute $0 to the investment portfolio rather than artificially liquidating principal.
* **Compounding:** Compounded monthly as an annuity-due (contributions invested at period start).

---

## Project Structure

```text
src/
├── data/
│   ├── types.ts          # Domain definitions (FilingStatus, HousingTier, Metro)
│   ├── metros.ts         # 45 metro benchmark datasets
│   ├── taxTables.ts      # 2026 Federal, FICA, and 28 jurisdiction tax specifications
│   └── metroData.ts      # Public barrel export
├── lib/
│   ├── tax.ts            # Pure tax bracket, FICA, and state/local logic
│   ├── simulation.ts     # Multi-year cash flow and compounding engine
│   ├── forecast.ts       # Fixed-contribution and savings-rate utilities
│   ├── milestones.ts     # Career and lifestyle event processors
│   └── persistence.ts    # LocalStorage schema validation
└── components/           # Modular React UI components
```

---

## Disclaimer

This software is built for informational exploration and personal financial modeling, not as formal tax or investment advice. Living expenses are benchmark estimates intended for relative metro-to-metro comparisons.

# Take-Home Savings Calculator (Built with Claude Code)

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

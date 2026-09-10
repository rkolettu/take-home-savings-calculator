import type { ByFilingStatus, StateTaxSpec, TaxBracket } from './types'

/* ------------------------------------------------------------------ *
 * FEDERAL — tax year 2026
 *
 * Source: IRS Rev. Proc. 2025-32 (the annual inflation adjustments for
 * 2026), reflecting the rate structure as amended by the 2025 budget
 * reconciliation act. These are PUBLISHED 2026 figures, not estimates.
 * ------------------------------------------------------------------ */

export const FEDERAL_STANDARD_DEDUCTION: ByFilingStatus<number> = {
  single: 16_100,
  marriedJoint: 32_200,
  headOfHousehold: 24_150,
}

export const FEDERAL_BRACKETS: ByFilingStatus<TaxBracket[]> = {
  single: [
    { upTo: 12_400, rate: 0.1 },
    { upTo: 50_400, rate: 0.12 },
    { upTo: 105_700, rate: 0.22 },
    { upTo: 201_775, rate: 0.24 },
    { upTo: 256_225, rate: 0.32 },
    { upTo: 640_600, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  marriedJoint: [
    { upTo: 24_800, rate: 0.1 },
    { upTo: 100_800, rate: 0.12 },
    { upTo: 211_400, rate: 0.22 },
    { upTo: 403_550, rate: 0.24 },
    { upTo: 512_450, rate: 0.32 },
    { upTo: 768_700, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  headOfHousehold: [
    { upTo: 17_700, rate: 0.1 },
    { upTo: 67_450, rate: 0.12 },
    { upTo: 105_700, rate: 0.22 },
    { upTo: 201_750, rate: 0.24 },
    { upTo: 256_200, rate: 0.32 },
    { upTo: 640_600, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
}

/* ------------------------------------------------------------------ *
 * FICA — tax year 2026 (employee share only)
 *
 * Social Security wage base per the SSA's October 2025 announcement.
 * The 0.9% Additional Medicare surtax thresholds are statutory and are
 * NOT inflation-indexed, so they are stable year over year.
 * ------------------------------------------------------------------ */

export const FICA = {
  socialSecurityRate: 0.062,
  socialSecurityWageBase: 184_500,
  medicareRate: 0.0145,
  additionalMedicareRate: 0.009,
  additionalMedicareThreshold: {
    single: 200_000,
    marriedJoint: 250_000,
    headOfHousehold: 200_000,
  } as ByFilingStatus<number>,
} as const

/* ------------------------------------------------------------------ *
 * STATES
 *
 * Only the jurisdictions covering the metros in `metros.ts` are modelled.
 * Read `confidence` before quoting any of these numbers.
 *
 * Simplifications that apply throughout:
 *  - Credits, phase-outs, and itemized deductions are not modelled.
 *  - Millionaire surtaxes (CA 1% MHSA, MA 4%) are noted but not applied,
 *    as they sit far above this tool's intended income range.
 *  - States that piggyback on federal taxable income use the federal
 *    standard deduction, reproduced here so `tax.ts` stays data-driven.
 * ------------------------------------------------------------------ */

const NO_EXEMPTION: ByFilingStatus<number> = {
  single: 0,
  marriedJoint: 0,
  headOfHousehold: 0,
}

const NO_DEDUCTION: ByFilingStatus<number> = {
  single: 0,
  marriedJoint: 0,
  headOfHousehold: 0,
}

export const STATE_TAX: Record<string, StateTaxSpec> = {
  /* --- No wage income tax --------------------------------------- */
  TX: {
    stateCode: 'TX',
    name: 'Texas',
    vintage: 2026,
    confidence: 'published-2026',
    kind: 'none',
  },
  FL: {
    stateCode: 'FL',
    name: 'Florida',
    vintage: 2026,
    confidence: 'published-2026',
    kind: 'none',
  },
  WA: {
    stateCode: 'WA',
    name: 'Washington',
    vintage: 2026,
    confidence: 'published-2026',
    kind: 'none',
    note: 'No wage income tax. Washington does levy a 7% tax on long-term capital gains above an annual exclusion, which this model does not cover.',
  },
  NV: {
    stateCode: 'NV',
    name: 'Nevada',
    vintage: 2026,
    confidence: 'published-2026',
    kind: 'none',
  },
  TN: {
    stateCode: 'TN',
    name: 'Tennessee',
    vintage: 2026,
    confidence: 'published-2026',
    kind: 'none',
    note: 'The Hall tax on interest and dividends was fully repealed in 2021.',
  },

  /* --- Flat rate ------------------------------------------------- */
  IL: {
    stateCode: 'IL',
    name: 'Illinois',
    vintage: 2025,
    confidence: 'carried-from-2025',
    kind: 'flat',
    rate: 0.0495,
    standardDeduction: NO_DEDUCTION,
    personalExemption: {
      single: 2_850,
      marriedJoint: 5_700,
      headOfHousehold: 2_850,
    },
    note: 'Illinois has no standard deduction; it allows a personal exemption that phases out at high incomes (phase-out not modelled).',
  },
  PA: {
    stateCode: 'PA',
    name: 'Pennsylvania',
    vintage: 2026,
    confidence: 'published-2026',
    kind: 'flat',
    rate: 0.0307,
    standardDeduction: NO_DEDUCTION,
    personalExemption: NO_EXEMPTION,
    note: 'Flat 3.07% on gross compensation with no standard deduction or personal exemption. Rate is statutory and has been unchanged since 2004.',
  },
  AZ: {
    stateCode: 'AZ',
    name: 'Arizona',
    vintage: 2026,
    confidence: 'published-2026',
    kind: 'flat',
    rate: 0.025,
    standardDeduction: {
      single: 16_100,
      marriedJoint: 32_200,
      headOfHousehold: 24_150,
    },
    personalExemption: NO_EXEMPTION,
    note: 'Arizona matches the federal standard deduction amount.',
  },
  CO: {
    stateCode: 'CO',
    name: 'Colorado',
    vintage: 2025,
    confidence: 'carried-from-2025',
    kind: 'flat',
    rate: 0.044,
    standardDeduction: {
      single: 16_100,
      marriedJoint: 32_200,
      headOfHousehold: 24_150,
    },
    personalExemption: NO_EXEMPTION,
    note: 'Starts from federal taxable income, so the federal standard deduction carries through. The rate can be temporarily reduced by TABOR surplus refunds in some years.',
  },
  MA: {
    stateCode: 'MA',
    name: 'Massachusetts',
    vintage: 2025,
    confidence: 'carried-from-2025',
    kind: 'flat',
    rate: 0.05,
    standardDeduction: NO_DEDUCTION,
    personalExemption: {
      single: 4_400,
      marriedJoint: 8_800,
      headOfHousehold: 6_800,
    },
    note: 'An additional 4% surtax applies to income above roughly $1M, which this model does not apply.',
  },
  GA: {
    stateCode: 'GA',
    name: 'Georgia',
    vintage: 2026,
    confidence: 'carried-from-2025',
    kind: 'flat',
    rate: 0.0499,
    standardDeduction: {
      single: 12_000,
      marriedJoint: 24_000,
      headOfHousehold: 12_000,
    },
    personalExemption: NO_EXEMPTION,
    note: 'Georgia is stepping its flat rate down on a statutory schedule (5.19% in 2025). The 4.99% target rate is used here, but the step can be paused by revenue triggers.',
  },
  NC: {
    stateCode: 'NC',
    name: 'North Carolina',
    vintage: 2026,
    confidence: 'carried-from-2025',
    kind: 'flat',
    rate: 0.0399,
    standardDeduction: {
      single: 12_750,
      marriedJoint: 25_500,
      headOfHousehold: 19_125,
    },
    personalExemption: NO_EXEMPTION,
    note: 'Scheduled step-down from 4.25% in 2025, subject to revenue triggers.',
  },
  MI: {
    stateCode: 'MI',
    name: 'Michigan',
    vintage: 2025,
    confidence: 'carried-from-2025',
    kind: 'flat',
    rate: 0.0425,
    standardDeduction: NO_DEDUCTION,
    personalExemption: {
      single: 5_800,
      marriedJoint: 11_600,
      headOfHousehold: 5_800,
    },
    note: 'Michigan has no standard deduction; it grants a per-person exemption that is indexed annually. Detroit levies its own resident income tax — see that metro entry.',
  },
  UT: {
    stateCode: 'UT',
    name: 'Utah',
    vintage: 2026,
    confidence: 'published-2026',
    kind: 'flat',
    rate: 0.0445,
    standardDeduction: NO_DEDUCTION,
    personalExemption: NO_EXEMPTION,
    note: 'Utah applies its flat rate to federal AGI and then grants a taxpayer credit that phases out with income. The credit is not modelled, so this slightly OVERSTATES Utah tax at low and middle incomes.',
  },

  /* --- Progressive ----------------------------------------------- */
  CA: {
    stateCode: 'CA',
    name: 'California',
    vintage: 2025,
    confidence: 'carried-from-2025',
    kind: 'progressive',
    standardDeduction: {
      single: 5_706,
      marriedJoint: 11_412,
      headOfHousehold: 11_412,
    },
    personalExemption: NO_EXEMPTION,
    brackets: {
      single: [
        { upTo: 11_079, rate: 0.01 },
        { upTo: 26_264, rate: 0.02 },
        { upTo: 41_452, rate: 0.04 },
        { upTo: 57_542, rate: 0.06 },
        { upTo: 72_724, rate: 0.08 },
        { upTo: 371_479, rate: 0.093 },
        { upTo: 445_771, rate: 0.103 },
        { upTo: 742_953, rate: 0.113 },
        { upTo: Infinity, rate: 0.123 },
      ],
      marriedJoint: [
        { upTo: 22_158, rate: 0.01 },
        { upTo: 52_528, rate: 0.02 },
        { upTo: 82_904, rate: 0.04 },
        { upTo: 115_084, rate: 0.06 },
        { upTo: 145_448, rate: 0.08 },
        { upTo: 742_958, rate: 0.093 },
        { upTo: 891_542, rate: 0.103 },
        { upTo: 1_485_906, rate: 0.113 },
        { upTo: Infinity, rate: 0.123 },
      ],
      headOfHousehold: [
        { upTo: 22_173, rate: 0.01 },
        { upTo: 52_530, rate: 0.02 },
        { upTo: 67_716, rate: 0.04 },
        { upTo: 83_805, rate: 0.06 },
        { upTo: 98_990, rate: 0.08 },
        { upTo: 505_208, rate: 0.093 },
        { upTo: 606_251, rate: 0.103 },
        { upTo: 1_010_417, rate: 0.113 },
        { upTo: Infinity, rate: 0.123 },
      ],
    },
    note: 'FTB 2026 estimated-tax instructions explicitly use the 2025 schedules: https://www.ftb.ca.gov/forms/2026/2026-540-es-instructions.pdf. These are verified 2025 figures carried into 2026 estimates, not published 2026 indexed brackets. Personal exemption credits and the 1% surcharge above $1M remain unmodelled.',
  },
  NY: {
    stateCode: 'NY',
    name: 'New York',
    vintage: 2026,
    confidence: 'published-2026',
    kind: 'progressive',
    standardDeduction: {
      single: 8_000,
      marriedJoint: 16_050,
      headOfHousehold: 11_200,
    },
    personalExemption: NO_EXEMPTION,
    brackets: {
      single: [
        { upTo: 8_500, rate: 0.039 },
        { upTo: 11_700, rate: 0.044 },
        { upTo: 13_900, rate: 0.0515 },
        { upTo: 80_650, rate: 0.054 },
        { upTo: 215_400, rate: 0.059 },
        { upTo: 1_077_550, rate: 0.0685 },
        { upTo: 5_000_000, rate: 0.0965 },
        { upTo: 25_000_000, rate: 0.103 },
        { upTo: Infinity, rate: 0.109 },
      ],
      marriedJoint: [
        { upTo: 17_150, rate: 0.039 },
        { upTo: 23_600, rate: 0.044 },
        { upTo: 27_900, rate: 0.0515 },
        { upTo: 161_550, rate: 0.054 },
        { upTo: 323_200, rate: 0.059 },
        { upTo: 2_155_350, rate: 0.0685 },
        { upTo: 5_000_000, rate: 0.0965 },
        { upTo: 25_000_000, rate: 0.103 },
        { upTo: Infinity, rate: 0.109 },
      ],
      headOfHousehold: [
        { upTo: 12_800, rate: 0.039 },
        { upTo: 17_650, rate: 0.044 },
        { upTo: 20_900, rate: 0.0515 },
        { upTo: 107_650, rate: 0.054 },
        { upTo: 269_300, rate: 0.059 },
        { upTo: 1_616_450, rate: 0.0685 },
        { upTo: 5_000_000, rate: 0.0965 },
        { upTo: 25_000_000, rate: 0.103 },
        { upTo: Infinity, rate: 0.109 },
      ],
    },
    note: '2026 IT-2105-I: https://www.tax.ny.gov/pdf/current_forms/it/it2105i.pdf. Standard deductions are unchanged; dependent exemptions and high-income tax-benefit recapture are not modelled. New York City residents owe a separate local income tax.',
  },
  DC: {
    stateCode: 'DC',
    name: 'District of Columbia',
    vintage: 2025,
    confidence: 'carried-from-2025',
    kind: 'progressive',
    standardDeduction: {
      single: 16_100,
      marriedJoint: 32_200,
      headOfHousehold: 24_150,
    },
    personalExemption: NO_EXEMPTION,
    brackets: {
      single: [
        { upTo: 10_000, rate: 0.04 },
        { upTo: 40_000, rate: 0.06 },
        { upTo: 60_000, rate: 0.065 },
        { upTo: 250_000, rate: 0.085 },
        { upTo: 500_000, rate: 0.0925 },
        { upTo: 1_000_000, rate: 0.0975 },
        { upTo: Infinity, rate: 0.1075 },
      ],
      marriedJoint: [
        { upTo: 10_000, rate: 0.04 },
        { upTo: 40_000, rate: 0.06 },
        { upTo: 60_000, rate: 0.065 },
        { upTo: 250_000, rate: 0.085 },
        { upTo: 500_000, rate: 0.0925 },
        { upTo: 1_000_000, rate: 0.0975 },
        { upTo: Infinity, rate: 0.1075 },
      ],
      headOfHousehold: [
        { upTo: 10_000, rate: 0.04 },
        { upTo: 40_000, rate: 0.06 },
        { upTo: 60_000, rate: 0.065 },
        { upTo: 250_000, rate: 0.085 },
        { upTo: 500_000, rate: 0.0925 },
        { upTo: 1_000_000, rate: 0.0975 },
        { upTo: Infinity, rate: 0.1075 },
      ],
    },
    note: 'DC applies the same bracket thresholds to every filing status; only the standard deduction differs. It matches the federal standard deduction.',
  },
  OR: {
    stateCode: 'OR',
    name: 'Oregon',
    vintage: 2025,
    confidence: 'carried-from-2025',
    kind: 'progressive',
    standardDeduction: {
      single: 2_800,
      marriedJoint: 5_600,
      headOfHousehold: 4_510,
    },
    personalExemption: NO_EXEMPTION,
    brackets: {
      single: [
        { upTo: 4_400, rate: 0.0475 },
        { upTo: 11_050, rate: 0.0675 },
        { upTo: 125_000, rate: 0.0875 },
        { upTo: Infinity, rate: 0.099 },
      ],
      marriedJoint: [
        { upTo: 8_800, rate: 0.0475 },
        { upTo: 22_100, rate: 0.0675 },
        { upTo: 250_000, rate: 0.0875 },
        { upTo: Infinity, rate: 0.099 },
      ],
      headOfHousehold: [
        { upTo: 8_800, rate: 0.0475 },
        { upTo: 22_100, rate: 0.0675 },
        { upTo: 250_000, rate: 0.0875 },
        { upTo: Infinity, rate: 0.099 },
      ],
    },
    note: 'Portland-area residents also owe Metro Supportive Housing and Multnomah County Preschool taxes; see `localIncomeTaxRate` on the Portland metro entry.',
  },
  MN: {
    stateCode: 'MN',
    name: 'Minnesota',
    vintage: 2026,
    confidence: 'published-2026',
    kind: 'progressive',
    standardDeduction: {
      single: 15_300,
      marriedJoint: 30_600,
      headOfHousehold: 23_000,
    },
    personalExemption: NO_EXEMPTION,
    brackets: {
      single: [
        { upTo: 33_310, rate: 0.0535 },
        { upTo: 109_430, rate: 0.068 },
        { upTo: 203_150, rate: 0.0785 },
        { upTo: Infinity, rate: 0.0985 },
      ],
      marriedJoint: [
        { upTo: 48_700, rate: 0.0535 },
        { upTo: 193_480, rate: 0.068 },
        { upTo: 337_930, rate: 0.0785 },
        { upTo: Infinity, rate: 0.0985 },
      ],
      headOfHousehold: [
        { upTo: 41_010, rate: 0.0535 },
        { upTo: 164_800, rate: 0.068 },
        { upTo: 270_060, rate: 0.0785 },
        { upTo: Infinity, rate: 0.0985 },
      ],
    },
    note: '2026 brackets and deductions: https://www.revenue.state.mn.us/minnesota-income-tax-rates-and-brackets. No personal exemption; dependent exemptions and high-income deduction reductions are not modelled.',
  },
  /* --- Added with the 45-metro expansion -------------------------- *
   * Each spec records its verified vintage; remaining carried figures
   * and deliberate approximations are noted below.                   */

  IN: {
    stateCode: 'IN',
    name: 'Indiana',
    vintage: 2026,
    confidence: 'carried-from-2025',
    kind: 'flat',
    rate: 0.0295,
    standardDeduction: NO_DEDUCTION,
    personalExemption: {
      single: 1_000,
      marriedJoint: 2_000,
      headOfHousehold: 1_000,
    },
    note: 'Indiana is stepping its flat rate down on a statutory schedule (3.00% in 2025). County income tax is levied separately; see `localIncomeTaxRate` on the Indianapolis metro entry.',
  },
  LA: {
    stateCode: 'LA',
    name: 'Louisiana',
    vintage: 2025,
    confidence: 'carried-from-2025',
    kind: 'flat',
    rate: 0.03,
    standardDeduction: {
      single: 12_500,
      marriedJoint: 25_000,
      headOfHousehold: 12_500,
    },
    personalExemption: NO_EXEMPTION,
    note: 'Louisiana replaced its progressive brackets with a flat 3% rate and a large standard deduction effective 2025.',
  },
  MD: {
    stateCode: 'MD',
    name: 'Maryland',
    vintage: 2026,
    confidence: 'published-2026',
    kind: 'progressive',
    standardDeduction: {
      single: 3_350,
      marriedJoint: 6_700,
      headOfHousehold: 6_700,
    },
    personalExemption: { single: 3_200, marriedJoint: 6_400, headOfHousehold: 3_200 },
    brackets: {
      single: [
        { upTo: 1_000, rate: 0.02 },
        { upTo: 2_000, rate: 0.03 },
        { upTo: 3_000, rate: 0.04 },
        { upTo: 100_000, rate: 0.0475 },
        { upTo: 125_000, rate: 0.05 },
        { upTo: 150_000, rate: 0.0525 },
        { upTo: 250_000, rate: 0.055 },
        { upTo: 500_000, rate: 0.0575 },
        { upTo: 1_000_000, rate: 0.0625 },
        { upTo: Infinity, rate: 0.065 },
      ],
      marriedJoint: [
        { upTo: 1_000, rate: 0.02 },
        { upTo: 2_000, rate: 0.03 },
        { upTo: 3_000, rate: 0.04 },
        { upTo: 150_000, rate: 0.0475 },
        { upTo: 175_000, rate: 0.05 },
        { upTo: 225_000, rate: 0.0525 },
        { upTo: 300_000, rate: 0.055 },
        { upTo: 600_000, rate: 0.0575 },
        { upTo: 1_200_000, rate: 0.0625 },
        { upTo: Infinity, rate: 0.065 },
      ],
      headOfHousehold: [
        { upTo: 1_000, rate: 0.02 },
        { upTo: 2_000, rate: 0.03 },
        { upTo: 3_000, rate: 0.04 },
        { upTo: 150_000, rate: 0.0475 },
        { upTo: 175_000, rate: 0.05 },
        { upTo: 225_000, rate: 0.0525 },
        { upTo: 300_000, rate: 0.055 },
        { upTo: 600_000, rate: 0.0575 },
        { upTo: 1_200_000, rate: 0.0625 },
        { upTo: Infinity, rate: 0.065 },
      ],
    },
    note: '2026 individual PV worksheet: https://www.marylandcomptroller.gov/content/dam/mdcomp/tax/forms/worksheets/2026-pv-worksheet.pdf. Uses its $3,350/$6,700 deductions (the separate employer guide uses $3,400 for withholding). The $3,200 personal exemption per adult is modelled without its income phase-out, understating tax above $100,000 single or $150,000 joint/head of household. Only Baltimore City local tax is represented.',
  },
  OH: {
    stateCode: 'OH',
    name: 'Ohio',
    vintage: 2026,
    confidence: 'carried-from-2025',
    kind: 'progressive',
    standardDeduction: NO_DEDUCTION,
    personalExemption: NO_EXEMPTION,
    brackets: {
      single: [
        { upTo: 26_050, rate: 0 },
        { upTo: Infinity, rate: 0.0275 },
      ],
      marriedJoint: [
        { upTo: 26_050, rate: 0 },
        { upTo: Infinity, rate: 0.0275 },
      ],
      headOfHousehold: [
        { upTo: 26_050, rate: 0 },
        { upTo: Infinity, rate: 0.0275 },
      ],
    },
    note: 'Ohio has been collapsing its brackets toward a single 2.75% rate above an exempt band; that endpoint is modelled here (2025 still carried a 3.5% top bracket). Bracket thresholds do not vary by filing status. Ohio municipalities levy their own income taxes — see the Columbus, Cincinnati and Cleveland metro entries.',
  },
  MO: {
    stateCode: 'MO',
    name: 'Missouri',
    vintage: 2026,
    confidence: 'published-2026',
    kind: 'progressive',
    standardDeduction: {
      single: 16_100,
      marriedJoint: 32_200,
      headOfHousehold: 24_150,
    },
    personalExemption: NO_EXEMPTION,
    brackets: {
      single: [
        { upTo: 1_348, rate: 0 },
        { upTo: 2_696, rate: 0.02 },
        { upTo: 4_044, rate: 0.025 },
        { upTo: 5_392, rate: 0.03 },
        { upTo: 6_740, rate: 0.035 },
        { upTo: 8_088, rate: 0.04 },
        { upTo: 9_436, rate: 0.045 },
        { upTo: Infinity, rate: 0.047 },
      ],
      marriedJoint: [
        { upTo: 1_348, rate: 0 },
        { upTo: 2_696, rate: 0.02 },
        { upTo: 4_044, rate: 0.025 },
        { upTo: 5_392, rate: 0.03 },
        { upTo: 6_740, rate: 0.035 },
        { upTo: 8_088, rate: 0.04 },
        { upTo: 9_436, rate: 0.045 },
        { upTo: Infinity, rate: 0.047 },
      ],
      headOfHousehold: [
        { upTo: 1_348, rate: 0 },
        { upTo: 2_696, rate: 0.02 },
        { upTo: 4_044, rate: 0.025 },
        { upTo: 5_392, rate: 0.03 },
        { upTo: 6_740, rate: 0.035 },
        { upTo: 8_088, rate: 0.04 },
        { upTo: 9_436, rate: 0.045 },
        { upTo: Infinity, rate: 0.047 },
      ],
    },
    note: '2026 annual brackets and deductions: https://dor.mo.gov/forms/Withholding%20Formula_2026.pdf. Missouri matches the federal standard deduction and uses the same brackets for every filing status. No personal exemption. Federal income tax deduction is not modelled. St. Louis and Kansas City levy separate earnings taxes.',
  },
  WI: {
    stateCode: 'WI',
    name: 'Wisconsin',
    vintage: 2026,
    confidence: 'published-2026',
    kind: 'progressive',
    standardDeduction: NO_DEDUCTION,
    personalExemption: {
      single: 700,
      marriedJoint: 1_400,
      headOfHousehold: 700,
    },
    brackets: {
      single: [
        { upTo: 15_110, rate: 0.035 },
        { upTo: 51_950, rate: 0.044 },
        { upTo: 332_720, rate: 0.053 },
        { upTo: Infinity, rate: 0.0765 },
      ],
      marriedJoint: [
        { upTo: 20_150, rate: 0.035 },
        { upTo: 69_260, rate: 0.044 },
        { upTo: 443_630, rate: 0.053 },
        { upTo: Infinity, rate: 0.0765 },
      ],
      headOfHousehold: [
        { upTo: 15_110, rate: 0.035 },
        { upTo: 51_950, rate: 0.044 },
        { upTo: 332_720, rate: 0.053 },
        { upTo: Infinity, rate: 0.0765 },
      ],
    },
    note: '2026 Form 1-ES: https://www.revenue.wi.gov/TaxForms2026/2026-Form1-ES-Inst.pdf. The income-tested standard deduction is modelled as zero, which OVERSTATES tax below its phase-out (about $136,453 single/head of household and $159,690 joint). Personal exemptions remain $700 per person.',
  },
  VA: {
    stateCode: 'VA',
    name: 'Virginia',
    vintage: 2025,
    confidence: 'carried-from-2025',
    kind: 'progressive',
    standardDeduction: {
      single: 8_500,
      marriedJoint: 17_000,
      headOfHousehold: 8_500,
    },
    personalExemption: NO_EXEMPTION,
    brackets: {
      single: [
        { upTo: 3_000, rate: 0.02 },
        { upTo: 5_000, rate: 0.03 },
        { upTo: 17_000, rate: 0.05 },
        { upTo: Infinity, rate: 0.0575 },
      ],
      marriedJoint: [
        { upTo: 3_000, rate: 0.02 },
        { upTo: 5_000, rate: 0.03 },
        { upTo: 17_000, rate: 0.05 },
        { upTo: Infinity, rate: 0.0575 },
      ],
      headOfHousehold: [
        { upTo: 3_000, rate: 0.02 },
        { upTo: 5_000, rate: 0.03 },
        { upTo: 17_000, rate: 0.05 },
        { upTo: Infinity, rate: 0.0575 },
      ],
    },
    note: 'Virginia applies the same bracket thresholds to every filing status; only the standard deduction differs. The top rate starts at a low $17,000, so most earners are effectively at 5.75% on the margin.',
  },
  CT: {
    stateCode: 'CT',
    name: 'Connecticut',
    vintage: 2026,
    confidence: 'published-2026',
    kind: 'progressive',
    standardDeduction: NO_DEDUCTION,
    personalExemption: NO_EXEMPTION,
    brackets: {
      single: [
        { upTo: 10_000, rate: 0.02 },
        { upTo: 50_000, rate: 0.045 },
        { upTo: 100_000, rate: 0.055 },
        { upTo: 200_000, rate: 0.06 },
        { upTo: 250_000, rate: 0.065 },
        { upTo: 500_000, rate: 0.069 },
        { upTo: Infinity, rate: 0.0699 },
      ],
      marriedJoint: [
        { upTo: 20_000, rate: 0.02 },
        { upTo: 100_000, rate: 0.045 },
        { upTo: 200_000, rate: 0.055 },
        { upTo: 400_000, rate: 0.06 },
        { upTo: 500_000, rate: 0.065 },
        { upTo: 1_000_000, rate: 0.069 },
        { upTo: Infinity, rate: 0.0699 },
      ],
      headOfHousehold: [
        { upTo: 16_000, rate: 0.02 },
        { upTo: 80_000, rate: 0.045 },
        { upTo: 160_000, rate: 0.055 },
        { upTo: 320_000, rate: 0.06 },
        { upTo: 400_000, rate: 0.065 },
        { upTo: 800_000, rate: 0.069 },
        { upTo: Infinity, rate: 0.0699 },
      ],
    },
    note: '2026 CT-1040ES: https://portal.ct.gov/-/media/drs/forms/2025/income/ct1040es-flat0126.pdf. Brackets are unchanged and there is no standard deduction. The income-tested personal exemption is modelled as zero, which OVERSTATES tax below its phase-out ($44,000 single, $71,000 joint, $56,000 head of household). The rate phase-out add-back, recapture and personal tax credits are not modelled.',
  },
  DE: {
    stateCode: 'DE',
    name: 'Delaware',
    vintage: 2026,
    confidence: 'published-2026',
    kind: 'progressive',
    standardDeduction: {
      single: 3_250,
      marriedJoint: 6_500,
      headOfHousehold: 3_250,
    },
    personalExemption: NO_EXEMPTION,
    brackets: {
      single: [
        { upTo: 2_000, rate: 0 },
        { upTo: 5_000, rate: 0.022 },
        { upTo: 10_000, rate: 0.039 },
        { upTo: 20_000, rate: 0.048 },
        { upTo: 25_000, rate: 0.052 },
        { upTo: 60_000, rate: 0.0555 },
        { upTo: Infinity, rate: 0.066 },
      ],
      marriedJoint: [
        { upTo: 2_000, rate: 0 },
        { upTo: 5_000, rate: 0.022 },
        { upTo: 10_000, rate: 0.039 },
        { upTo: 20_000, rate: 0.048 },
        { upTo: 25_000, rate: 0.052 },
        { upTo: 60_000, rate: 0.0555 },
        { upTo: Infinity, rate: 0.066 },
      ],
      headOfHousehold: [
        { upTo: 2_000, rate: 0 },
        { upTo: 5_000, rate: 0.022 },
        { upTo: 10_000, rate: 0.039 },
        { upTo: 20_000, rate: 0.048 },
        { upTo: 25_000, rate: 0.052 },
        { upTo: 60_000, rate: 0.0555 },
        { upTo: Infinity, rate: 0.066 },
      ],
    },
    note: '2026 PIT-EST: https://revenuefiles.delaware.gov/2025/PITForms_Instructions/Instructions/PIT-EST_Instructions_2026-01.pdf. Standard deduction is $3,250 single/head of household and $6,500 joint; brackets are unchanged. The $110 personal credit is not an income exemption and is unmodelled. Wilmington levies a city wage tax.',
  },
}

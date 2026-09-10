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
 * Only the 19 jurisdictions covering the 25 metros in `metros.ts` are
 * modelled. Read `confidence` before quoting any of these numbers:
 * several states index their brackets annually and had not published
 * 2026 figures, so the 2025 values are carried forward as estimates.
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
      single: 5_540,
      marriedJoint: 11_080,
      headOfHousehold: 11_080,
    },
    personalExemption: NO_EXEMPTION,
    brackets: {
      single: [
        { upTo: 10_756, rate: 0.01 },
        { upTo: 25_499, rate: 0.02 },
        { upTo: 40_245, rate: 0.04 },
        { upTo: 55_866, rate: 0.06 },
        { upTo: 70_606, rate: 0.08 },
        { upTo: 360_659, rate: 0.093 },
        { upTo: 432_787, rate: 0.103 },
        { upTo: 721_314, rate: 0.113 },
        { upTo: Infinity, rate: 0.123 },
      ],
      marriedJoint: [
        { upTo: 21_512, rate: 0.01 },
        { upTo: 50_998, rate: 0.02 },
        { upTo: 80_490, rate: 0.04 },
        { upTo: 111_732, rate: 0.06 },
        { upTo: 141_212, rate: 0.08 },
        { upTo: 721_318, rate: 0.093 },
        { upTo: 865_574, rate: 0.103 },
        { upTo: 1_442_628, rate: 0.113 },
        { upTo: Infinity, rate: 0.123 },
      ],
      headOfHousehold: [
        { upTo: 21_527, rate: 0.01 },
        { upTo: 51_000, rate: 0.02 },
        { upTo: 65_744, rate: 0.04 },
        { upTo: 81_364, rate: 0.06 },
        { upTo: 96_107, rate: 0.08 },
        { upTo: 490_493, rate: 0.093 },
        { upTo: 588_593, rate: 0.103 },
        { upTo: 980_987, rate: 0.113 },
        { upTo: Infinity, rate: 0.123 },
      ],
    },
    note: 'A further 1% Mental Health Services surcharge applies above $1M and is not modelled. California indexes its brackets annually; 2026 figures were not published at time of writing.',
  },
  NY: {
    stateCode: 'NY',
    name: 'New York',
    vintage: 2025,
    confidence: 'carried-from-2025',
    kind: 'progressive',
    standardDeduction: {
      single: 8_000,
      marriedJoint: 16_050,
      headOfHousehold: 11_200,
    },
    personalExemption: NO_EXEMPTION,
    brackets: {
      single: [
        { upTo: 8_500, rate: 0.04 },
        { upTo: 11_700, rate: 0.045 },
        { upTo: 13_900, rate: 0.0525 },
        { upTo: 80_650, rate: 0.055 },
        { upTo: 215_400, rate: 0.06 },
        { upTo: 1_077_550, rate: 0.0685 },
        { upTo: 5_000_000, rate: 0.0965 },
        { upTo: 25_000_000, rate: 0.103 },
        { upTo: Infinity, rate: 0.109 },
      ],
      marriedJoint: [
        { upTo: 17_150, rate: 0.04 },
        { upTo: 23_600, rate: 0.045 },
        { upTo: 27_900, rate: 0.0525 },
        { upTo: 161_550, rate: 0.055 },
        { upTo: 323_200, rate: 0.06 },
        { upTo: 2_155_350, rate: 0.0685 },
        { upTo: 5_000_000, rate: 0.0965 },
        { upTo: 25_000_000, rate: 0.103 },
        { upTo: Infinity, rate: 0.109 },
      ],
      headOfHousehold: [
        { upTo: 12_800, rate: 0.04 },
        { upTo: 17_650, rate: 0.045 },
        { upTo: 20_900, rate: 0.0525 },
        { upTo: 107_650, rate: 0.055 },
        { upTo: 269_300, rate: 0.06 },
        { upTo: 1_616_450, rate: 0.0685 },
        { upTo: 5_000_000, rate: 0.0965 },
        { upTo: 25_000_000, rate: 0.103 },
        { upTo: Infinity, rate: 0.109 },
      ],
    },
    note: 'New York City residents owe an additional local income tax; see `localIncomeTaxRate` on the New York metro entry.',
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
    vintage: 2025,
    confidence: 'carried-from-2025',
    kind: 'progressive',
    standardDeduction: {
      single: 14_950,
      marriedJoint: 29_900,
      headOfHousehold: 22_500,
    },
    personalExemption: NO_EXEMPTION,
    brackets: {
      single: [
        { upTo: 32_570, rate: 0.0535 },
        { upTo: 106_990, rate: 0.068 },
        { upTo: 198_630, rate: 0.0785 },
        { upTo: Infinity, rate: 0.0985 },
      ],
      marriedJoint: [
        { upTo: 47_620, rate: 0.0535 },
        { upTo: 189_180, rate: 0.068 },
        { upTo: 330_410, rate: 0.0785 },
        { upTo: Infinity, rate: 0.0985 },
      ],
      headOfHousehold: [
        { upTo: 40_100, rate: 0.0535 },
        { upTo: 161_130, rate: 0.068 },
        { upTo: 264_520, rate: 0.0785 },
        { upTo: Infinity, rate: 0.0985 },
      ],
    },
    note: 'Minnesota indexes its brackets and standard deduction annually; 2026 figures were not published at time of writing.',
  },
  /* --- Added with the 45-metro expansion -------------------------- *
   * Every one of these carries 2025 figures forward. None had a
   * published 2026 table at time of writing, and several index their
   * brackets annually. Treat them as estimates, not filings.          */

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
    vintage: 2025,
    confidence: 'carried-from-2025',
    kind: 'progressive',
    standardDeduction: {
      single: 2_700,
      marriedJoint: 5_450,
      headOfHousehold: 5_450,
    },
    personalExemption: NO_EXEMPTION,
    brackets: {
      single: [
        { upTo: 1_000, rate: 0.02 },
        { upTo: 2_000, rate: 0.03 },
        { upTo: 3_000, rate: 0.04 },
        { upTo: 100_000, rate: 0.0475 },
        { upTo: 125_000, rate: 0.05 },
        { upTo: 150_000, rate: 0.0525 },
        { upTo: 250_000, rate: 0.055 },
        { upTo: Infinity, rate: 0.0575 },
      ],
      marriedJoint: [
        { upTo: 1_000, rate: 0.02 },
        { upTo: 2_000, rate: 0.03 },
        { upTo: 3_000, rate: 0.04 },
        { upTo: 150_000, rate: 0.0475 },
        { upTo: 175_000, rate: 0.05 },
        { upTo: 225_000, rate: 0.0525 },
        { upTo: 300_000, rate: 0.055 },
        { upTo: Infinity, rate: 0.0575 },
      ],
      headOfHousehold: [
        { upTo: 1_000, rate: 0.02 },
        { upTo: 2_000, rate: 0.03 },
        { upTo: 3_000, rate: 0.04 },
        { upTo: 150_000, rate: 0.0475 },
        { upTo: 175_000, rate: 0.05 },
        { upTo: 225_000, rate: 0.0525 },
        { upTo: 300_000, rate: 0.055 },
        { upTo: Infinity, rate: 0.0575 },
      ],
    },
    note: "Maryland's standard deduction is 15% of income between a floor and a cap; the cap is used here, which is correct at every income this tool targets. Every Maryland county and Baltimore City also levies a local income tax — see `localIncomeTaxRate` on the Baltimore metro entry.",
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
        { upTo: 1_273, rate: 0 },
        { upTo: 2_546, rate: 0.02 },
        { upTo: 3_819, rate: 0.025 },
        { upTo: 5_092, rate: 0.03 },
        { upTo: 6_365, rate: 0.035 },
        { upTo: 7_638, rate: 0.04 },
        { upTo: 8_911, rate: 0.045 },
        { upTo: Infinity, rate: 0.047 },
      ],
      marriedJoint: [
        { upTo: 1_273, rate: 0 },
        { upTo: 2_546, rate: 0.02 },
        { upTo: 3_819, rate: 0.025 },
        { upTo: 5_092, rate: 0.03 },
        { upTo: 6_365, rate: 0.035 },
        { upTo: 7_638, rate: 0.04 },
        { upTo: 8_911, rate: 0.045 },
        { upTo: Infinity, rate: 0.047 },
      ],
      headOfHousehold: [
        { upTo: 1_273, rate: 0 },
        { upTo: 2_546, rate: 0.02 },
        { upTo: 3_819, rate: 0.025 },
        { upTo: 5_092, rate: 0.03 },
        { upTo: 6_365, rate: 0.035 },
        { upTo: 7_638, rate: 0.04 },
        { upTo: 8_911, rate: 0.045 },
        { upTo: Infinity, rate: 0.047 },
      ],
    },
    note: 'Missouri matches the federal standard deduction and applies the same bracket thresholds to every filing status. The top rate steps down when revenue triggers are met. St. Louis and Kansas City levy earnings taxes — see those metro entries.',
  },
  WI: {
    stateCode: 'WI',
    name: 'Wisconsin',
    vintage: 2025,
    confidence: 'carried-from-2025',
    kind: 'progressive',
    standardDeduction: NO_DEDUCTION,
    personalExemption: {
      single: 700,
      marriedJoint: 1_400,
      headOfHousehold: 700,
    },
    brackets: {
      single: [
        { upTo: 14_320, rate: 0.035 },
        { upTo: 28_640, rate: 0.044 },
        { upTo: 315_310, rate: 0.053 },
        { upTo: Infinity, rate: 0.0765 },
      ],
      marriedJoint: [
        { upTo: 19_090, rate: 0.035 },
        { upTo: 38_190, rate: 0.044 },
        { upTo: 420_420, rate: 0.053 },
        { upTo: Infinity, rate: 0.0765 },
      ],
      headOfHousehold: [
        { upTo: 14_320, rate: 0.035 },
        { upTo: 28_640, rate: 0.044 },
        { upTo: 315_310, rate: 0.053 },
        { upTo: Infinity, rate: 0.0765 },
      ],
    },
    note: "Wisconsin's sliding standard deduction phases out entirely well below the incomes this tool targets, so it is modelled as zero. That OVERSTATES Wisconsin tax at low incomes.",
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
    vintage: 2025,
    confidence: 'carried-from-2025',
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
    note: 'Connecticut has no standard deduction. Its personal exemption phases out completely by roughly $71,000 for a single filer and is modelled as zero, which OVERSTATES tax below that level. A recapture provision that claws back the lower brackets at high incomes is also not modelled, which understates tax for top earners.',
  },
  DE: {
    stateCode: 'DE',
    name: 'Delaware',
    vintage: 2025,
    confidence: 'carried-from-2025',
    kind: 'progressive',
    standardDeduction: {
      single: 5_700,
      marriedJoint: 11_400,
      headOfHousehold: 5_700,
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
    note: 'Delaware applies the same bracket thresholds to every filing status. The standard deduction figure reflects a recent increase and is the least certain number in this table — verify it before relying on Delaware output. Wilmington levies a city wage tax; see that metro entry.',
  },
}

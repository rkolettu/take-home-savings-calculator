import { readFile, writeFile } from 'node:fs/promises'

const LIVE_DATA_PATH = new URL('../src/data/liveData.json', import.meta.url)
const COST_DATA_PATH = new URL('../src/data/sourcedCosts.json', import.meta.url)

// The original metro figures remain the level baseline. Public datasets move
// those figures forward over time, which avoids pretending a broad index is a
// perfect one-bedroom/one-person price level for every city.
const COST_BASE_PERIOD = '2026-07'
const USDA_GROCERY_BASE_PERIOD = '2026-01'
const USDA_MODERATE_SINGLE_ADULT_BASE = 431.64
const LEGACY_GROCERY_REFERENCE = 480

const ZILLOW_URL =
  'https://files.zillowstatic.com/research/public_csvs/zori/Metro_zori_uc_sfrcondomfr_sm_month.csv'

const BLS_FILES = {
  allItems: 'https://download.bls.gov/pub/time.series/cu/cu.data.1.AllItems',
  groceries:
    'https://download.bls.gov/pub/time.series/cu/cu.data.11.USFoodBeverage',
  utilities:
    'https://download.bls.gov/pub/time.series/cu/cu.data.12.USHousing',
  transport:
    'https://download.bls.gov/pub/time.series/cu/cu.data.14.USTransportation',
  discretionary:
    'https://download.bls.gov/pub/time.series/cu/cu.data.16.USRecreation',
}

const BLS_SERIES = {
  allItems: 'CUSR0000SA0',
  groceries: 'CUSR0000SAF11',
  utilities: 'CUSR0000SAH2',
  transport: 'CUSR0000SAT',
  discretionary: 'CUSR0000SAR',
}

/**
 * Zillow publishes MSA-level ZORI under a principal-city name. A few labels in
 * the calculator intentionally represent a broader nearby market, so those use
 * the closest defensible Zillow MSA proxy rather than fragile fuzzy matching.
 */
const ZILLOW_METROS = {
  'new-york-ny': ['New York', 'NY'],
  'boston-ma': ['Boston', 'MA'],
  'stamford-ct': ['Bridgeport', 'CT'],
  'washington-dc': ['Washington', 'DC'],
  'philadelphia-pa': ['Philadelphia', 'PA'],
  'hartford-ct': ['Hartford', 'CT'],
  'baltimore-md': ['Baltimore', 'MD'],
  'wilmington-de': ['Philadelphia', 'PA'],
  'pittsburgh-pa': ['Pittsburgh', 'PA'],
  'chicago-il': ['Chicago', 'IL'],
  'minneapolis-mn': ['Minneapolis', 'MN'],
  'columbus-oh': ['Columbus', 'OH'],
  'milwaukee-wi': ['Milwaukee', 'WI'],
  'kansas-city-mo': ['Kansas City', 'MO'],
  'indianapolis-in': ['Indianapolis', 'IN'],
  'cincinnati-oh': ['Cincinnati', 'OH'],
  'st-louis-mo': ['St. Louis', 'MO'],
  'detroit-mi': ['Detroit', 'MI'],
  'cleveland-oh': ['Cleveland', 'OH'],
  'miami-fl': ['Miami', 'FL'],
  'palm-beach-fl': ['Miami', 'FL'],
  'naples-fl': ['Naples', 'FL'],
  'tampa-fl': ['Tampa', 'FL'],
  'atlanta-ga': ['Atlanta', 'GA'],
  'orlando-fl': ['Orlando', 'FL'],
  'nashville-tn': ['Nashville', 'TN'],
  'charlotte-nc': ['Charlotte', 'NC'],
  'raleigh-durham-nc': ['Raleigh', 'NC'],
  'jacksonville-fl': ['Jacksonville', 'FL'],
  'new-orleans-la': ['New Orleans', 'LA'],
  'richmond-va': ['Richmond', 'VA'],
  'austin-tx': ['Austin', 'TX'],
  'dallas-tx': ['Dallas', 'TX'],
  'phoenix-az': ['Phoenix', 'AZ'],
  'las-vegas-nv': ['Las Vegas', 'NV'],
  'houston-tx': ['Houston', 'TX'],
  'san-antonio-tx': ['San Antonio', 'TX'],
  'denver-co': ['Denver', 'CO'],
  'salt-lake-city-ut': ['Salt Lake City', 'UT'],
  'san-francisco-ca': ['San Francisco', 'CA'],
  'san-jose-ca': ['San Jose', 'CA'],
  'los-angeles-ca': ['Los Angeles', 'CA'],
  'san-diego-ca': ['San Diego', 'CA'],
  'seattle-wa': ['Seattle', 'WA'],
  'portland-or': ['Portland', 'OR'],
}

function monthNumber(period) {
  if (!/^M\d{2}$/.test(period) || period === 'M13') return null
  const month = Number(period.slice(1))
  return month >= 1 && month <= 12 ? month : null
}

function periodKey(period) {
  return Number(period.slice(0, 4)) * 100 + Number(period.slice(5, 7))
}

function formatPeriod(period) {
  const [year, month] = period.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

function shortPeriod(period) {
  const [year, month] = period.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'take-home-savings-calculator data refresh' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
  return response.text()
}

async function safeSource(label, fn) {
  try {
    return await fn()
  } catch (error) {
    console.warn(`[${label}] refresh skipped; keeping last-known-good data.`)
    console.warn(error instanceof Error ? error.message : error)
    return null
  }
}

function parseBlsSeries(text, seriesId) {
  const points = new Map()
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith(seriesId)) continue
    const [id, year, period, rawValue] = line.split('\t').map((part) => part.trim())
    if (id !== seriesId) continue
    const month = monthNumber(period)
    const value = Number(rawValue)
    if (month === null || !Number.isFinite(value) || value <= 0) continue
    points.set(`${year}-${String(month).padStart(2, '0')}`, value)
  }
  if (points.size === 0) throw new Error(`No observations found for ${seriesId}`)
  return points
}

function latestPoint(points) {
  const period = [...points.keys()].sort((a, b) => periodKey(b) - periodKey(a))[0]
  if (!period) throw new Error('Series has no monthly observations')
  return { period, value: points.get(period) }
}

function boundedMultiplier(value, label, min = 0.5, max = 1.5) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} multiplier ${value} failed validation`)
  }
  return Number(value.toFixed(6))
}

function parseCsvLine(line) {
  const cells = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"'
        i += 1
      } else {
        quoted = !quoted
      }
    } else if (char === ',' && !quoted) {
      cells.push(cell)
      cell = ''
    } else {
      cell += char
    }
  }
  cells.push(cell)
  return cells
}

function parseZillow(text) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) throw new Error('Zillow CSV is empty')
  const headers = parseCsvLine(lines[0])
  const dateColumns = headers.filter((header) => /^\d{4}-\d{2}-\d{2}$/.test(header))
  if (dateColumns.length === 0) throw new Error('Zillow CSV has no monthly columns')

  const latestColumn = dateColumns[dateColumns.length - 1]
  const baseColumn = dateColumns.find((column) => column.startsWith(COST_BASE_PERIOD))
  if (!baseColumn) throw new Error(`Zillow CSV has no ${COST_BASE_PERIOD} baseline`)

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
  })

  return { rows, latestColumn, baseColumn }
}

function findZillowRow(rows, regionName, stateName) {
  const expected = `${regionName}, ${stateName}`.toLowerCase()
  return rows.find((row) => {
    const name = String(row.RegionName ?? '').trim().toLowerCase()
    const state = String(row.StateName ?? '').trim().toUpperCase()
    return name === expected && (!state || state === stateName)
  })
}

async function refreshBls(existingCosts, nextCosts, existingLive, nextLive) {
  const [allItemsText, groceriesText, utilitiesText, transportText, discretionaryText] =
    await Promise.all([
      fetchText(BLS_FILES.allItems),
      fetchText(BLS_FILES.groceries),
      fetchText(BLS_FILES.utilities),
      fetchText(BLS_FILES.transport),
      fetchText(BLS_FILES.discretionary),
    ])

  const allItems = parseBlsSeries(allItemsText, BLS_SERIES.allItems)
  const groceries = parseBlsSeries(groceriesText, BLS_SERIES.groceries)
  const utilities = parseBlsSeries(utilitiesText, BLS_SERIES.utilities)
  const transport = parseBlsSeries(transportText, BLS_SERIES.transport)
  const discretionary = parseBlsSeries(discretionaryText, BLS_SERIES.discretionary)

  const latestAll = latestPoint(allItems)
  const priorYearPeriod = `${Number(latestAll.period.slice(0, 4)) - 1}${latestAll.period.slice(4)}`
  const priorYearValue = allItems.get(priorYearPeriod)
  if (!priorYearValue) throw new Error(`Missing prior-year CPI observation ${priorYearPeriod}`)
  const inflationRate = latestAll.value / priorYearValue - 1
  if (!Number.isFinite(inflationRate) || inflationRate < -0.1 || inflationRate > 0.25) {
    throw new Error(`CPI inflation ${inflationRate} failed validation`)
  }

  const latestGroceries = latestPoint(groceries)
  const groceryBase = groceries.get(USDA_GROCERY_BASE_PERIOD)
  if (!groceryBase) throw new Error(`Missing food CPI baseline ${USDA_GROCERY_BASE_PERIOD}`)
  const currentUsdaModerate =
    USDA_MODERATE_SINGLE_ADULT_BASE * (latestGroceries.value / groceryBase)
  const groceryMultiplier = boundedMultiplier(
    currentUsdaModerate / LEGACY_GROCERY_REFERENCE,
    'groceries',
    0.7,
    1.3,
  )

  const categorySeries = [
    ['utilities', utilities],
    ['transport', transport],
    ['discretionary', discretionary],
  ]

  const multipliers = { ...existingCosts.categoryMultipliers, groceries: groceryMultiplier }
  const periods = {
    ...existingCosts.categoryPeriods,
    groceries: formatPeriod(latestGroceries.period),
  }

  for (const [key, points] of categorySeries) {
    const latest = latestPoint(points)
    const base = points.get(COST_BASE_PERIOD)
    if (!base) throw new Error(`Missing ${key} CPI baseline ${COST_BASE_PERIOD}`)
    multipliers[key] = boundedMultiplier(latest.value / base, key, 0.75, 1.25)
    periods[key] = formatPeriod(latest.period)
  }

  nextCosts.categoryMultipliers = multipliers
  nextCosts.categoryPeriods = periods
  nextLive.inflationLabel = 'Latest available'
  nextLive.inflationRate = Number(inflationRate.toFixed(4))
  nextLive.inflationPeriod = formatPeriod(latestAll.period)
  nextLive.inflationSource = 'U.S. Bureau of Labor Statistics CPI-U bulk data'
  nextLive.costIndexPeriod = formatPeriod(latestAll.period)

  return latestAll.period
}

async function refreshZillow(existingCosts, nextCosts, nextLive) {
  const text = await fetchText(ZILLOW_URL)
  const { rows, latestColumn, baseColumn } = parseZillow(text)
  const latestPeriod = latestColumn.slice(0, 7)

  const baseValues = { ...existingCosts.housingBaseValues }
  const latestValues = { ...existingCosts.housingLatestValues }
  const multipliers = { ...existingCosts.housingMultipliers }
  let coverage = 0

  for (const [metroId, [regionName, stateName]] of Object.entries(ZILLOW_METROS)) {
    const row = findZillowRow(rows, regionName, stateName)
    if (!row) continue

    const latest = Number(row[latestColumn])
    const sourceBase = Number(row[baseColumn])
    if (
      !Number.isFinite(latest) ||
      !Number.isFinite(sourceBase) ||
      latest < 400 ||
      latest > 15_000 ||
      sourceBase < 400 ||
      sourceBase > 15_000
    ) {
      continue
    }

    const base = Number(baseValues[metroId]) || sourceBase
    const multiplier = latest / base
    if (!Number.isFinite(multiplier) || multiplier < 0.5 || multiplier > 1.5) continue

    baseValues[metroId] = Number(base.toFixed(2))
    latestValues[metroId] = Number(latest.toFixed(2))
    multipliers[metroId] = Number(multiplier.toFixed(6))
    coverage += 1
  }

  if (coverage < 30) {
    throw new Error(`Zillow coverage only ${coverage}/${Object.keys(ZILLOW_METROS).length}`)
  }

  nextCosts.housingBaseValues = baseValues
  nextCosts.housingLatestValues = latestValues
  nextCosts.housingMultipliers = multipliers
  nextCosts.housingPeriod = formatPeriod(latestPeriod)
  nextCosts.housingCoverage = coverage
  nextLive.rentEstimates = `Zillow-indexed · ${shortPeriod(latestPeriod)}`
  nextLive.rentSource = 'Zillow Observed Rent Index (ZORI)'

  return latestPeriod
}

async function main() {
  const existingLive = JSON.parse(await readFile(LIVE_DATA_PATH, 'utf8'))
  const existingCosts = JSON.parse(await readFile(COST_DATA_PATH, 'utf8'))
  const nextLive = structuredClone(existingLive)
  const nextCosts = structuredClone(existingCosts)

  const blsPeriod = await safeSource('BLS bulk data', () =>
    refreshBls(existingCosts, nextCosts, existingLive, nextLive),
  )
  const zillowPeriod = await safeSource('Zillow ZORI', () =>
    refreshZillow(existingCosts, nextCosts, nextLive),
  )

  if (!blsPeriod && !zillowPeriod) {
    throw new Error('All external refreshes failed; last-known-good files were left untouched')
  }

  const now = new Date()
  const versionParts = [
    zillowPeriod ? `zori-${zillowPeriod}` : `zori-${existingCosts.housingPeriod}`,
    blsPeriod ? `bls-${blsPeriod}` : `bls-${existingLive.inflationPeriod}`,
  ]
  nextCosts.dataVersion = versionParts.join('_')
  nextCosts.generatedAt = now.toISOString().slice(0, 10)
  nextCosts.basePeriod = COST_BASE_PERIOD
  nextLive.dataUpdated = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(now)
  nextLive.refreshedAt = now.toISOString().slice(0, 10)
  nextLive.costModel = 'Public-data indexed benchmarks'

  const nextLiveText = `${JSON.stringify(nextLive, null, 2)}\n`
  const nextCostsText = `${JSON.stringify(nextCosts, null, 2)}\n`
  const existingLiveText = `${JSON.stringify(existingLive, null, 2)}\n`
  const existingCostsText = `${JSON.stringify(existingCosts, null, 2)}\n`

  let changed = false
  if (nextLiveText !== existingLiveText) {
    await writeFile(LIVE_DATA_PATH, nextLiveText)
    changed = true
  }
  if (nextCostsText !== existingCostsText) {
    await writeFile(COST_DATA_PATH, nextCostsText)
    changed = true
  }

  if (!changed) {
    console.log('No source data changed; keeping current generated files.')
    return
  }

  console.log(
    `Refresh complete. BLS: ${blsPeriod ?? 'fallback'}; Zillow: ${zillowPeriod ?? 'fallback'}.`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

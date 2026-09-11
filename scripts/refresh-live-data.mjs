import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const LIVE_DATA_PATH = new URL('../src/data/liveData.json', import.meta.url)
const COST_DATA_PATH = new URL('../src/data/sourcedCosts.json', import.meta.url)
const COST_CONFIG_PATH = new URL('../src/data/costDataConfig.ts', import.meta.url)
const HUD_API_BASE = 'https://www.huduser.gov/hudapi/public/fmr'
const HUD_ANCHOR_YEAR = 2027
const HUD_REQUEST_INTERVAL_MS = 1_100

/** HUD metro codes from the FY2027 listMetroAreas geography. */
export const HUD_METROS = {
  'new-york-ny': 'METRO35620MM5600',
  'boston-ma': 'METRO14460MM1120',
  // Stamford/Greenwich is represented by the containing Bridgeport-Stamford-Danbury MSA.
  'stamford-ct': 'METRO14860M14860',
  'washington-dc': 'METRO47900M47900',
  'philadelphia-pa': 'METRO37980M37980',
  'hartford-ct': 'METRO25540M25540',
  'baltimore-md': 'METRO12580M12580',
  'wilmington-de': 'METRO37980M37980',
  'pittsburgh-pa': 'METRO38300M38300',
  'chicago-il': 'METRO16980M16980',
  'minneapolis-mn': 'METRO33460M33460',
  'columbus-oh': 'METRO18140M18140',
  'milwaukee-wi': 'METRO33340M33340',
  'kansas-city-mo': 'METRO28140M28140',
  'indianapolis-in': 'METRO26900M26900',
  'cincinnati-oh': 'METRO17140M17140',
  'st-louis-mo': 'METRO41180M41180',
  'detroit-mi': 'METRO19820M19820',
  'cleveland-oh': 'METRO17410N17460',
  'miami-fl': 'METRO33100MM5000',
  // Palm Beach uses HUD's West Palm Beach-Boca Raton subarea rather than Miami.
  'palm-beach-fl': 'METRO33100MM8960',
  'naples-fl': 'METRO34940M34940',
  'tampa-fl': 'METRO45300M45300',
  'atlanta-ga': 'METRO12060M12060',
  'orlando-fl': 'METRO36740M36740',
  'nashville-tn': 'METRO34980M34980',
  'charlotte-nc': 'METRO16740M16740',
  // The product label spans two CBSAs; Raleigh-Cary is the primary market and prior proxy.
  'raleigh-durham-nc': 'METRO39580M39580',
  'jacksonville-fl': 'METRO27260M27260',
  'new-orleans-la': 'METRO35380M35380',
  'richmond-va': 'METRO40060M40060',
  'austin-tx': 'METRO12420M12420',
  'dallas-tx': 'METRO19100M19100',
  'phoenix-az': 'METRO38060M38060',
  'las-vegas-nv': 'METRO29820M29820',
  'houston-tx': 'METRO26420M26420',
  'san-antonio-tx': 'METRO41700M41700',
  'denver-co': 'METRO19740M19740',
  'salt-lake-city-ut': 'METRO41620M41620',
  'san-francisco-ca': 'METRO41860MM7360',
  'san-jose-ca': 'METRO41940M41940',
  'los-angeles-ca': 'METRO31080MM4480',
  'san-diego-ca': 'METRO41740M41740',
  'seattle-wa': 'METRO42660MM7600',
  'portland-or': 'METRO38900M38900',
}

function boundedMultiplier(value, label, min = 0.5, max = 1.5) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} multiplier ${value} failed validation`)
  }
  return Number(value.toFixed(6))
}

function requireHudToken(token) {
  if (typeof token !== 'string' || token.trim() === '') {
    throw new Error('HUD_API_TOKEN is required; HUD data was not refreshed')
  }
  return token.trim()
}

export async function verifyHudMetroMapping({
  token,
  metros = HUD_METROS,
  fetchImpl = fetch,
}) {
  const accessToken = requireHudToken(token)
  const response = await fetchImpl(`${HUD_API_BASE}/listMetroAreas`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'take-home-savings-calculator data refresh',
    },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) {
    throw new Error(`HUD listMetroAreas returned HTTP ${response.status}`)
  }
  const listedCodes = new Set(
    (await response.json())?.data?.map((entry) => entry.cbsa_code),
  )
  const missing = Object.entries(metros)
    .filter(([, cbsaCode]) => !listedCodes.has(cbsaCode))
    .map(([metroId]) => metroId)
  if (missing.length > 0) {
    throw new Error(`HUD metro mapping validation failed: ${missing.join(', ')}`)
  }
  return Object.keys(metros).length
}

export function parseHudOneBedroom(payload, label) {
  const basicData = payload?.data?.basicdata
  const msaData = Array.isArray(basicData)
    ? basicData.find((entry) => entry?.zip_code === 'MSA level')
    : basicData
  const value = Number(msaData?.['One-Bedroom'])
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} has no valid HUD One-Bedroom FMR`)
  }
  return value
}

function createHudThrottle({
  intervalMs = HUD_REQUEST_INTERVAL_MS,
  now = Date.now,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  let lastRequestStarted = null
  return async () => {
    if (lastRequestStarted !== null) {
      const wait = intervalMs - (now() - lastRequestStarted)
      if (wait > 0) await sleep(wait)
    }
    lastRequestStarted = now()
  }
}

export async function fetchHudYear({
  year,
  token,
  metros = HUD_METROS,
  fetchImpl = fetch,
  now = Date.now,
  sleep,
}) {
  const accessToken = requireHudToken(token)
  const throttle = createHudThrottle({ now, sleep })
  const rents = {}
  const failures = []

  for (const [metroId, cbsaCode] of Object.entries(metros)) {
    await throttle()
    const url = `${HUD_API_BASE}/data/${encodeURIComponent(cbsaCode)}?year=${year}`
    try {
      const response = await fetchImpl(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'take-home-savings-calculator data refresh',
        },
        signal: AbortSignal.timeout(30_000),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      rents[metroId] = parseHudOneBedroom(await response.json(), `${metroId} FY${year}`)
    } catch (error) {
      failures.push(metroId)
      console.error(
        `[HUD FY${year}] ${metroId} failed: ${error instanceof Error ? error.message : error}`,
      )
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `HUD FY${year} coverage ${Object.keys(rents).length}/${Object.keys(metros).length}; failed: ${failures.join(', ')}`,
    )
  }
  return rents
}

export function buildHudUpdate({
  existingCosts,
  existingLive,
  metros = HUD_METROS,
  anchorYear,
  currentYear,
  anchorRents,
  currentRents,
}) {
  const metroIds = Object.keys(metros)
  const missing = metroIds.filter((metroId) =>
    !Number.isFinite(anchorRents[metroId]) || anchorRents[metroId] <= 0 ||
    !Number.isFinite(currentRents[metroId]) || currentRents[metroId] <= 0)
  if (missing.length > 0) {
    throw new Error(`HUD rent coverage incomplete: ${missing.join(', ')}`)
  }

  const multipliers = {}
  const baseValues = {}
  const latestValues = {}
  for (const metroId of metroIds) {
    const anchor = anchorRents[metroId]
    const current = currentRents[metroId]
    baseValues[metroId] = anchor
    latestValues[metroId] = current
    multipliers[metroId] = boundedMultiplier(
      current / anchor,
      `${metroId} HUD FMR`,
      0.75,
      1.25,
    )
  }

  const hasHousingDrift = Object.values(multipliers).some(
    (value) => Math.abs(value - 1) > 0.00001,
  )
  const nextCosts = structuredClone(existingCosts)
  const nextLive = structuredClone(existingLive)
  nextCosts.housingMultipliers = multipliers
  nextCosts.housingBaseValues = baseValues
  nextCosts.housingLatestValues = latestValues
  nextCosts.housingAnchorYear = anchorYear
  nextCosts.housingPeriod = `FY${currentYear}`
  nextCosts.housingCoverage = metroIds.length
  nextCosts.sources.housing =
    'Zumper August 2026 asking-rent anchors, indexed with HUD Fair Market Rent 1BR year-over-year drift'

  if (hasHousingDrift) {
    nextLive.rentEstimates = `HUD FMR-indexed · FY${currentYear}`
    nextLive.rentSource = 'Zumper Aug 2026 anchor, HUD Fair Market Rent 1BR drift'
    nextLive.costModel = 'Anchored benchmarks, FMR-indexed'
    nextLive.costIndexPeriod = `FY${currentYear}`
  }

  return { nextCosts, nextLive, hasHousingDrift }
}

async function main() {
  const token = requireHudToken(process.env.HUD_API_TOKEN)
  const existingLive = JSON.parse(await readFile(LIVE_DATA_PATH, 'utf8'))
  const existingCosts = JSON.parse(await readFile(COST_DATA_PATH, 'utf8'))
  const now = new Date()
  const currentYear = now.getUTCMonth() >= 8
    ? now.getUTCFullYear() + 1
    : now.getUTCFullYear()

  if (process.env.HUD_VERIFY_METRO_MAPPING === 'true') {
    const mapped = await verifyHudMetroMapping({ token })
    console.log(`HUD metro mapping validated: ${mapped}/${Object.keys(HUD_METROS).length}.`)
  }

  const anchorRents = await fetchHudYear({
    year: HUD_ANCHOR_YEAR,
    token,
  })
  const currentRents = currentYear === HUD_ANCHOR_YEAR
    ? { ...anchorRents }
    : await fetchHudYear({ year: currentYear, token })
  const { nextCosts, nextLive, hasHousingDrift } = buildHudUpdate({
    existingCosts,
    existingLive,
    anchorYear: HUD_ANCHOR_YEAR,
    currentYear,
    anchorRents,
    currentRents,
  })

  const retainedVersions = String(existingCosts.dataVersion ?? '')
    .split('_')
    .filter((part) => part && !part.startsWith('zori-') && !part.startsWith('hud-fmr-'))
  nextCosts.dataVersion = [
    `hud-fmr-${currentYear}-anchor-${HUD_ANCHOR_YEAR}`,
    ...retainedVersions,
  ].join('_')
  nextCosts.generatedAt = now.toISOString().slice(0, 10)
  nextLive.dataUpdated = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(now)
  nextLive.refreshedAt = now.toISOString().slice(0, 10)

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
  if (hasHousingDrift) {
    const existingConfig = await readFile(COST_CONFIG_PATH, 'utf8')
    const enabledConfig = existingConfig.replace(
      'export const USE_AUTOMATIC_COST_UPDATES = false',
      'export const USE_AUTOMATIC_COST_UPDATES = true',
    )
    if (enabledConfig !== existingConfig) {
      await writeFile(COST_CONFIG_PATH, enabledConfig)
      changed = true
    } else if (!existingConfig.includes('export const USE_AUTOMATIC_COST_UPDATES = true')) {
      throw new Error('Could not enable USE_AUTOMATIC_COST_UPDATES')
    }
  }

  if (!changed) {
    console.log('No HUD source data changed; keeping current generated files.')
    return
  }

  const multiplierValues = Object.values(nextCosts.housingMultipliers)
  console.log(`HUD FY${currentYear} coverage: ${nextCosts.housingCoverage}/${Object.keys(HUD_METROS).length}`)
  console.log(
    `HUD multiplier range: ${Math.min(...multiplierValues).toFixed(6)}–${Math.max(...multiplierValues).toFixed(6)}`,
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

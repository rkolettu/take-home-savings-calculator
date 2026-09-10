import { readFile, writeFile } from 'node:fs/promises'

const DATA_PATH = new URL('../src/data/liveData.json', import.meta.url)
const CPI_SERIES = 'CUUR0000SA0'
const BLS_URL = `https://api.bls.gov/publicAPI/v2/timeseries/data/${CPI_SERIES}`

function monthNumber(period) {
  if (!/^M\d{2}$/.test(period) || period === 'M13') return null
  const month = Number(period.slice(1))
  return month >= 1 && month <= 12 ? month : null
}

function periodKey(point) {
  return Number(point.year) * 100 + monthNumber(point.period)
}

async function main() {
  const response = await fetch(BLS_URL, {
    headers: { 'User-Agent': 'take-home-savings-calculator data refresh' },
  })
  if (!response.ok) {
    throw new Error(`BLS request failed with ${response.status}`)
  }

  const payload = await response.json()
  if (payload.status !== 'REQUEST_SUCCEEDED') {
    throw new Error(`BLS API did not succeed: ${JSON.stringify(payload.message ?? [])}`)
  }

  const series = payload.Results?.series?.[0]
  const points = (series?.data ?? [])
    .filter((point) => monthNumber(point.period) !== null)
    .sort((a, b) => periodKey(b) - periodKey(a))

  const latest = points[0]
  if (!latest) throw new Error('BLS response contained no monthly CPI observations')

  const priorYear = points.find(
    (point) =>
      Number(point.year) === Number(latest.year) - 1 &&
      point.period === latest.period,
  )
  if (!priorYear) {
    throw new Error('BLS response did not include the matching prior-year CPI observation')
  }

  const latestValue = Number(latest.value)
  const priorValue = Number(priorYear.value)
  if (!Number.isFinite(latestValue) || !Number.isFinite(priorValue) || priorValue <= 0) {
    throw new Error('BLS returned invalid CPI values')
  }

  const inflationRate = latestValue / priorValue - 1
  const existing = JSON.parse(await readFile(DATA_PATH, 'utf8'))
  const now = new Date()
  const dataUpdated = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(now)

  const next = {
    ...existing,
    dataUpdated,
    inflationLabel: 'Latest available',
    inflationRate: Number(inflationRate.toFixed(4)),
    inflationPeriod: `${latest.periodName} ${latest.year}`,
    inflationSource: 'U.S. Bureau of Labor Statistics CPI-U',
    refreshedAt: now.toISOString().slice(0, 10),
  }

  const materialFields = [
    'dataUpdated',
    'inflationRate',
    'inflationPeriod',
    'inflationSource',
  ]
  const changed = materialFields.some((key) => existing[key] !== next[key])

  if (!changed) {
    console.log(`No new CPI data. Latest remains ${latest.periodName} ${latest.year}.`)
    return
  }

  await writeFile(DATA_PATH, `${JSON.stringify(next, null, 2)}\n`)
  console.log(
    `Updated CPI-U inflation to ${(inflationRate * 100).toFixed(1)}% for ${latest.periodName} ${latest.year}.`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

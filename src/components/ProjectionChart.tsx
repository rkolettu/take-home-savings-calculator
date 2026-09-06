import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { percent, usd, usdShort } from '../lib/format'
import type { SimulationYear } from '../lib/simulation'

interface ProjectionChartProps {
  years: SimulationYear[]
  startingBalance: number
  inflationRate: number
  realMode: boolean
}

interface ChartPoint {
  year: number
  principal: number
  growth: number
  balance: number
  grossSalary: number
  invested: number
  cumulativeContributions: number
  annualSurplus: number
  events: string[]
}

/* Two series, so a legend is mandatory. Identity comes from the coloured
   swatch beside each label, never from colouring the text itself. */
const SERIES = [
  { key: 'principal', label: 'Principal contributed', color: 'var(--series-1)' },
  { key: 'growth', label: 'Investment growth', color: 'var(--series-3)' },
]

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: ChartPoint }[]
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload

  const rows = [
    { label: 'Gross salary', value: usd(point.grossSalary) },
    {
      label: 'Invested this year',
      value: usd(point.invested),
      warn: point.annualSurplus < 0,
    },
    { label: 'Cumulative contributions', value: usd(point.cumulativeContributions) },
    { label: 'Ending balance', value: usd(point.balance), strong: true },
  ]

  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-xs shadow-lg"
      style={{
        background: 'var(--surface-1)',
        borderColor: 'var(--border)',
        minWidth: 220,
      }}
    >
      <div className="mb-1.5 font-semibold text-[var(--text-primary)]">
        Year {point.year}
      </div>
      <table className="w-full">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="py-0.5 pr-3 text-[var(--text-secondary)]">
                {row.label}
              </td>
              <td
                className="py-0.5 text-right tabular-nums"
                style={{
                  color: row.warn
                    ? 'var(--status-critical)'
                    : 'var(--text-primary)',
                  fontWeight: row.strong ? 600 : 400,
                }}
              >
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {point.annualSurplus < 0 && (
        <div className="mt-1.5 text-[11px] text-[var(--status-critical)]">
          Deficit of {usd(Math.abs(point.annualSurplus))} — nothing invested.
        </div>
      )}
      {point.events.length > 0 && (
        <ul
          className="mt-2 space-y-0.5 border-t pt-1.5 text-[11px] text-[var(--text-secondary)]"
          style={{ borderColor: 'var(--gridline)' }}
        >
          {point.events.map((event) => (
            <li key={event}>• {event}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ProjectionChart({
  years,
  startingBalance,
  inflationRate,
  realMode,
}: ProjectionChartProps) {
  const data = useMemo<ChartPoint[]>(
    () =>
      years.map((row) => {
        /* In real mode every dollar figure is deflated by the same factor,
           so the stack still sums exactly to the deflated balance. */
        const deflator = realMode ? (1 + inflationRate) ** row.year : 1
        const principal =
          (startingBalance + row.cumulativeContributions) / deflator
        const growth = row.growth / deflator

        return {
          year: row.year,
          principal,
          growth,
          balance: principal + growth,
          grossSalary: row.grossSalary,
          invested: row.invested,
          cumulativeContributions: startingBalance + row.cumulativeContributions,
          annualSurplus: row.annualSurplus,
          events: row.events,
        }
      }),
    [years, startingBalance, inflationRate, realMode],
  )

  const final = data[data.length - 1]

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-xs text-[var(--text-muted)]">
            Projected balance at year {final.year}
            {realMode ? ", in today's dollars" : ', nominal'}
          </div>
          <div className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            {usd(final.balance)}
          </div>
        </div>
        <div className="text-right text-xs text-[var(--text-secondary)]">
          <div className="tabular-nums">
            {usd(final.principal)} contributed
          </div>
          <div className="tabular-nums">
            {usd(final.growth)} growth
            {final.balance > 0 && (
              <span className="text-[var(--text-muted)]">
                {' '}
                ({percent(final.growth / final.balance, 0)})
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--gridline)"
              strokeWidth={1}
            />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={{ stroke: 'var(--baseline)' }}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickFormatter={(year: number) => (year === 0 ? 'Now' : `Y${year}`)}
              minTickGap={16}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickFormatter={(value: number) => usdShort(value)}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: 'var(--baseline)', strokeWidth: 1 }}
            />
            <Legend
              verticalAlign="top"
              align="left"
              height={28}
              iconType="square"
              iconSize={10}
              formatter={(value: string) => (
                <span
                  style={{ color: 'var(--text-secondary)', fontSize: 12 }}
                >
                  {value}
                </span>
              )}
            />
            {SERIES.map((series) => (
              <Area
                key={series.key}
                type="monotone"
                dataKey={series.key}
                name={series.label}
                stackId="portfolio"
                fill={series.color}
                fillOpacity={0.92}
                /* A 2px stroke in the surface colour is the gap that keeps
                   the stacked bands reading as separate fills. */
                stroke="var(--surface-1)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

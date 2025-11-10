import { useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDashboardData } from '../data/DashboardDataProvider'
import { formatKwh } from '../../../utils/formatters'
import styles from './ForecastSection.module.css'

export function ForecastSection() {
  const { forecast, aggregations, nowcast } = useDashboardData()

  const { forecastData, mae, bias, nextForecast } = useMemo(() => {
    const hourlyData = aggregations.hour ?? []
    const hourlyActual = new Map<string, number>(
      hourlyData.map((point) => [point.timestamp, point.totalKwh]),
    )

    const data = forecast.map((point) => ({
      timestamp: point.timestamp,
      expectedKwh: point.expectedKwh,
      lowerKwh: point.lowerKwh,
      upperKwh: point.upperKwh,
      actualKwh: hourlyActual.get(point.timestamp),
    }))

    const errors = data
      .filter((item) => item.actualKwh != null)
      .map((item) => (item.actualKwh ?? 0) - item.expectedKwh)

    const mae =
      errors.length > 0
        ? errors.reduce((acc, err) => acc + Math.abs(err), 0) / errors.length
        : 0
    const bias =
      errors.length > 0 ? errors.reduce((acc, err) => acc + err, 0) / errors.length : 0

    const nextForecast = data.find((item) => !item.actualKwh)

    return { forecastData: data, mae, bias, nextForecast }
  }, [aggregations.hour, forecast])

  const nowcastChart = useMemo(
    () =>
      nowcast.map((point) => ({
        timestamp: point.timestamp,
        estimatedKwh: point.estimatedKwh,
        actualKwh: point.actualKwh,
      })),
    [nowcast],
  )

  if (forecastData.length === 0) return null

  const formatter = new Intl.DateTimeFormat('cs-CZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
  })

  return (
    <section className={styles.section} aria-labelledby="forecast-title">
      <header className={styles.header}>
        <div>
          <h2 id="forecast-title">Forecast & nowcast</h2>
          <p className={styles.subtitle}>Compare model projections against measured data.</p>
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3>Hourly forecast</h3>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={forecastData}>
                <defs>
                  <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(79, 156, 255, 0.5)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="rgba(79, 156, 255, 0.05)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => formatter.format(new Date(value))}
                  stroke="rgba(255,255,255,0.4)"
                  minTickGap={24}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.4)"
                  tickFormatter={(value) => `${value.toFixed(2)} kWh`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(8, 12, 20, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                  formatter={(value: number, key: string) => [`${value.toFixed(3)} kWh`, key]}
                  labelFormatter={(label) => formatter.format(new Date(label))}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="upperKwh"
                  stroke="none"
                  fill="url(#forecastBand)"
                  name="Forecast range"
                  activeDot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="lowerKwh"
                  stroke="none"
                  fill="rgba(79, 156, 255, 0.05)"
                  activeDot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="expectedKwh"
                  stroke="rgba(79, 156, 255, 0.9)"
                  strokeWidth={2}
                  name="Forecast"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="actualKwh"
                  stroke="rgba(45, 212, 191, 0.9)"
                  strokeWidth={2}
                  name="Actual"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <dl className={styles.stats}>
            <div>
              <dt>MAE</dt>
              <dd>{formatKwh(mae)}</dd>
            </div>
            <div>
              <dt>Bias</dt>
              <dd>{formatKwh(bias)}</dd>
            </div>
            <div>
              <dt>Next hour</dt>
              <dd>
                {nextForecast
                  ? `${formatKwh(nextForecast.expectedKwh)} ± ${formatKwh(nextForecast.upperKwh - nextForecast.expectedKwh)}`
                  : '–'}
              </dd>
            </div>
          </dl>
        </div>

        <div className={styles.card}>
          <h3>Nowcast</h3>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={nowcastChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) =>
                    new Intl.DateTimeFormat('cs-CZ', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(value))
                  }
                  stroke="rgba(255,255,255,0.4)"
                  minTickGap={24}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.4)"
                  tickFormatter={(value) => `${value.toFixed(3)} kWh`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(8, 12, 20, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                  formatter={(value: number, key: string) => [`${value.toFixed(3)} kWh`, key]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actualKwh"
                  stroke="rgba(45, 212, 191, 0.9)"
                  strokeWidth={2}
                  name="Actual"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="estimatedKwh"
                  stroke="rgba(255, 149, 128, 0.9)"
                  strokeWidth={2}
                  name="Nowcast"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className={styles.nowcastNote}>
            Last update: {nowcast.at(-1)?.timestamp ? new Date(nowcast.at(-1)!.timestamp).toLocaleString() : '–'}
          </p>
        </div>
      </div>
    </section>
  )
}

import { useMemo } from 'react'
import { useDashboardData } from '../data/DashboardDataProvider'
import { formatCurrency, formatKwh, formatCostPerKwh, deltaLabel } from '../../../utils/formatters'
import { KpiCard } from '../components/KpiCard'
import styles from './OverviewSection.module.css'

function buildSparkline(data: Array<{ timestamp: string; totalKwh: number }>) {
  if (data.length === 0) return []
  const step = Math.max(1, Math.floor(data.length / 40))
  return data.filter((_, index) => index % step === 0).map((point) => ({
    timestamp: point.timestamp,
    value: point.totalKwh,
  }))
}

export function OverviewSection() {
  const { primaryConsumption, aggregations, nowcast, forecast, timeRange } = useDashboardData()

  const {
    totalKwh,
    totalCost,
    costPerKwh,
    dailyDelta,
    forecastDelta,
    nowcastAccuracy,
    sparkline,
  } = useMemo(() => {
    const sumReducer = (acc: number, value: number) => acc + value
    const totalKwh = primaryConsumption.map((item) => item.totalKwh).reduce(sumReducer, 0)
    const totalCost = primaryConsumption.map((item) => item.totalCostKc).reduce(sumReducer, 0)
    const costPerKwh = totalKwh === 0 ? 0 : totalCost / totalKwh

    const dayAggregations = aggregations.day
    const currentDay = dayAggregations.at(-1)
    const previousDay = dayAggregations.at(-2)
    const dailyDelta =
      currentDay && previousDay ? deltaLabel(currentDay.totalKwh, previousDay.totalKwh) : '–'

    const lastForecast = forecast.at(-1)
    const lastMeasurement = primaryConsumption.at(-1)
    const forecastDelta =
      lastForecast && lastMeasurement
        ? deltaLabel(lastMeasurement.totalKwh, lastForecast.expectedKwh)
        : '–'

    const nowcastPoints = nowcast.slice(-12) // last hour (5-minute steps)
    const filled = nowcastPoints.filter((point) => point.actualKwh && point.estimatedKwh)
    const error =
      filled.length > 0
        ? filled.reduce(
            (acc, point) => acc + Math.abs((point.estimatedKwh ?? 0) - (point.actualKwh ?? 0)),
            0,
          ) / filled.length
        : 0
    const meanActual =
      filled.length > 0
        ? filled.reduce((acc, point) => acc + (point.actualKwh ?? 0), 0) / filled.length
        : 0
    const nowcastAccuracy =
      meanActual === 0 ? '–' : `${(100 - Math.min(100, (error / meanActual) * 100)).toFixed(1)}%`

    const sparkline = buildSparkline(primaryConsumption.map((item) => ({
      timestamp: item.timestamp,
      totalKwh: item.totalKwh,
    })))

    return { totalKwh, totalCost, costPerKwh, dailyDelta, forecastDelta, nowcastAccuracy, sparkline }
  }, [aggregations.day, forecast, nowcast, primaryConsumption])

  if (primaryConsumption.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby="overview-title">
      <header className={styles.header}>
        <div>
          <h2 id="overview-title">Overview</h2>
          <p className={styles.subtitle}>
            Consumption snapshot from {new Date(timeRange.from).toLocaleString()} to{' '}
            {new Date(timeRange.to).toLocaleString()}
          </p>
        </div>
      </header>
      <div className={styles.grid}>
        <KpiCard
          title="Energy consumed"
          value={formatKwh(totalKwh)}
          deltaLabel={dailyDelta}
          caption="Compared to previous day"
          sparkline={sparkline}
        />
        <KpiCard
          title="Cost"
          value={formatCurrency(totalCost)}
          caption={formatCostPerKwh(costPerKwh)}
          sparkline={sparkline.map((point) => ({
            ...point,
            value: point.value * costPerKwh,
          }))}
        />
        <KpiCard
          title="Forecast deviation"
          value={forecastDelta ?? '–'}
          caption="Last forecast vs actual"
          accent="neutral"
          sparkline={forecast.map((point) => ({
            timestamp: point.timestamp,
            value: point.expectedKwh,
          }))}
        />
        <KpiCard
          title="Nowcast accuracy"
          value={nowcastAccuracy}
          accent="critical"
          caption="Last hour mean absolute error"
          sparkline={nowcast.map((point) => ({
            timestamp: point.timestamp,
            value: (point.estimatedKwh ?? 0) - (point.actualKwh ?? 0),
          }))}
        />
      </div>
    </section>
  )
}

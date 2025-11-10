import { useMemo } from 'react'
import { useDashboardData } from '../data/DashboardDataProvider'
import { formatCurrency, formatKwh, formatPercentage } from '../../../utils/formatters'
import styles from './AlertsSection.module.css'

type Severity = 'info' | 'warning' | 'critical'

interface Alert {
  id: string
  title: string
  severity: Severity
  description: string
  recommendation?: string
}

export function AlertsSection() {
  const { forecast, nowcast, aggregations, invoices } = useDashboardData()

  const alerts = useMemo<Alert[]>(() => {
    const items: Alert[] = []
    const hourlyAggregations = aggregations.hour ?? []

    // Forecast deviation alert
    const hourlyActual = new Map<string, number>(
      hourlyAggregations.map((point) => [point.timestamp, point.totalKwh]),
    )
    const deviation = forecast
      .slice(-6)
      .map((point) => {
        const actual = hourlyActual.get(point.timestamp)
        if (!actual) return 0
        return Math.abs(actual - point.expectedKwh) / point.expectedKwh
      })
      .filter((value) => value > 0)

    const avgDeviation =
      deviation.length > 0 ? deviation.reduce((acc, val) => acc + val, 0) / deviation.length : 0

    if (avgDeviation > 0.15) {
      items.push({
        id: 'forecast-drift',
        title: 'Forecast deviates above 15%',
        severity: 'warning',
        description: `Average difference between forecast and actual in the last hours is ${formatPercentage(avgDeviation)}.`,
        recommendation:
          'Check model inputs for wholesale component and consider recalibrating the forecast parameters.',
      })
    }

    // Nowcast stale data alert
    const latestNowcast = nowcast.at(-1)
    if (latestNowcast) {
      const minutesSince = (Date.now() - new Date(latestNowcast.timestamp).getTime()) / 60000
      if (minutesSince > 20) {
        items.push({
          id: 'nowcast-stale',
          title: 'Nowcast feed is stale',
          severity: 'critical',
          description: `Last nowcast update was ${Math.round(minutesSince)} minutes ago.`,
          recommendation:
            'Verify the data pipeline connectivity or fall back to hour-level estimates.',
        })
      }
    }

    // Invoice upcoming due
    const openInvoice = invoices.find((invoice) => invoice.status !== 'paid')
    if (openInvoice) {
      const dueInDays =
        (new Date(openInvoice.dueAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      if (dueInDays < 5) {
        items.push({
          id: 'invoice-due',
          title: 'Upcoming invoice due',
          severity: 'info',
          description: `${formatCurrency(openInvoice.totalCostKc)} due on ${new Date(openInvoice.dueAt).toLocaleDateString()}`,
          recommendation:
            'Review the invoice line items and ensure payment or dispute before the due date.',
        })
      }
    }

    // Peak load detection
    const recentPeaks = hourlyAggregations.slice(-24).map((point) => point.peakKwh)
    const maxPeak = recentPeaks.length > 0 ? Math.max(...recentPeaks) : 0
    if (maxPeak > 0.08) {
      items.push({
        id: 'peak-load',
        title: 'Peak load nearing threshold',
        severity: 'warning',
        description: `Highest hourly peak in the last day reached ${formatKwh(maxPeak)}.`,
        recommendation: 'Investigate heat pump scheduling or EV charging window to flatten peaks.',
      })
    }

    return items
  }, [aggregations.hour, forecast, invoices, nowcast])

  if (alerts.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby="alerts-title">
      <header className={styles.header}>
        <div>
          <h2 id="alerts-title">Alerts & insights</h2>
          <p className={styles.subtitle}>Automated flags based on forecast accuracy and billing.</p>
        </div>
      </header>

      <ul className={styles.list}>
        {alerts.map((alert) => (
          <li key={alert.id} className={styles.card} data-severity={alert.severity}>
            <div className={styles.cardHeader}>
              <span className={styles.badge}>{alert.severity}</span>
              <h3>{alert.title}</h3>
            </div>
            <p className={styles.description}>{alert.description}</p>
            {alert.recommendation && (
              <p className={styles.recommendation}>Recommendation: {alert.recommendation}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

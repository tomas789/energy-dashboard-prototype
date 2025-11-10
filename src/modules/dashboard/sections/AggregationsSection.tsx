import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDashboardData } from '../data/DashboardDataProvider'
import type { ConsumptionGranularity } from '../../../api/types'
import { formatCurrency, formatKwh, formatPercentage } from '../../../utils/formatters'
import styles from './AggregationsSection.module.css'

const GRANULARITIES: ConsumptionGranularity[] = ['hour', 'day', 'week', 'month']

export function AggregationsSection() {
  const { aggregations } = useDashboardData()
  const [activeGranularity, setActiveGranularity] = useState<ConsumptionGranularity>('day')

  const { data, totalKwh, totalCost, avgCostPerKwh, componentShares } = useMemo(() => {
    const dataset = aggregations[activeGranularity] ?? []
    if (dataset.length === 0) {
      return {
        data: [],
        totalKwh: 0,
        totalCost: 0,
        avgCostPerKwh: 0,
        componentShares: {
          wholesale: 0,
          regulated: 0,
          other: 0,
        },
      }
    }

    const totalKwh = dataset.reduce((acc, point) => acc + point.totalKwh, 0)
    const totalCost = dataset.reduce((acc, point) => acc + point.totalCostKc, 0)
    const avgCostPerKwh = totalKwh === 0 ? 0 : totalCost / totalKwh

    const wholesale = dataset.reduce((acc, point) => acc + point.components.wholesale.costKc, 0)
    const regulated = dataset.reduce((acc, point) => acc + point.components.regulated.costKc, 0)
    const other = dataset.reduce((acc, point) => acc + (point.components.other?.costKc ?? 0), 0)
    const totalComponents = wholesale + regulated + other

    const componentShares = {
      wholesale: totalComponents === 0 ? 0 : wholesale / totalComponents,
      regulated: totalComponents === 0 ? 0 : regulated / totalComponents,
      other: totalComponents === 0 ? 0 : other / totalComponents,
    }

    const data = dataset.map((point) => ({
      timestamp: point.timestamp,
      totalKwh: point.totalKwh,
      costPerKwh: point.costPerKwh,
      totalCost: point.totalCostKc,
      wholesale: point.components.wholesale.costKc,
      regulated: point.components.regulated.costKc,
      other: point.components.other?.costKc ?? 0,
    }))

    return { data, totalKwh, totalCost, avgCostPerKwh, componentShares }
  }, [activeGranularity, aggregations])

  if (data.length === 0) return null

  const formatter = new Intl.DateTimeFormat('cs-CZ', {
    day: '2-digit',
    month: activeGranularity === 'month' ? 'short' : 'numeric',
    hour: activeGranularity === 'hour' ? '2-digit' : undefined,
  })

  return (
    <section className={styles.section} aria-labelledby="aggregations-title">
      <header className={styles.header}>
        <div>
          <h2 id="aggregations-title">Aggregations</h2>
          <p className={styles.subtitle}>Summaries by {activeGranularity}</p>
        </div>
        <div className={styles.tabs} role="tablist">
          {GRANULARITIES.map((granularity) => (
            <button
              key={granularity}
              role="tab"
              type="button"
              aria-selected={granularity === activeGranularity}
              className={
                granularity === activeGranularity ? styles.tabActive : styles.tabInactive
              }
              onClick={() => setActiveGranularity(granularity)}
            >
              {granularity.charAt(0).toUpperCase() + granularity.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="timestamp"
              stroke="rgba(255,255,255,0.4)"
              tickFormatter={(value) => formatter.format(new Date(value))}
              minTickGap={24}
            />
            <YAxis
              yAxisId="left"
              stroke="rgba(255,255,255,0.4)"
              tickFormatter={(value) => `${value.toFixed(1)} kWh`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="rgba(255,255,255,0.4)"
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(8, 12, 20, 0.95)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
              }}
              formatter={(value: number, key: string) =>
                key === 'totalKwh'
                  ? [`${value.toFixed(2)} kWh`, 'Total kWh']
                  : [formatCurrency(value), key]
              }
              labelFormatter={(label) => formatter.format(new Date(label))}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="totalKwh"
              fill="rgba(79, 156, 255, 0.7)"
              name="Total kWh"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              yAxisId="right"
              dataKey="totalCost"
              fill="rgba(124, 92, 255, 0.6)"
              name="Total cost"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total consumption</p>
          <p className={styles.statValue}>{formatKwh(totalKwh)}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total cost</p>
          <p className={styles.statValue}>{formatCurrency(totalCost)}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Average cost / kWh</p>
          <p className={styles.statValue}>{formatCurrency(avgCostPerKwh)} / kWh</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Component share</p>
          <p className={styles.statValue}>
            {formatPercentage(componentShares.wholesale)} wholesale ·{' '}
            {formatPercentage(componentShares.regulated)} regulated ·{' '}
            {formatPercentage(componentShares.other)} other
          </p>
        </div>
      </div>
    </section>
  )
}

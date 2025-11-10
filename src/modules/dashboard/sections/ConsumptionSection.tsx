import { useMemo, useState } from 'react'
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
import { useDashboardData } from '../data/DashboardDataProvider'
import { useDashboardStore } from '../../../store/dashboardStore'
import { formatCurrency, formatKwh } from '../../../utils/formatters'
import styles from './ConsumptionSection.module.css'

type MetricMode = 'energy' | 'cost'

const CHART_COLORS = {
  wholesale: '#4f9cff',
  regulated: '#7c5cff',
  other: '#2dd4bf',
}

export function ConsumptionSection() {
  const { primaryConsumption } = useDashboardData()
  const granularity = useDashboardStore((state) => state.granularity)
  const componentFilters = useDashboardStore((state) => state.componentFilters)
  const [metric, setMetric] = useState<MetricMode>('energy')

  const { chartData, peakKwh, baseLoadKwh, avgCostPerKwh, totalSamples } = useMemo(() => {
    if (primaryConsumption.length === 0) {
      return {
        chartData: [],
        peakKwh: 0,
        baseLoadKwh: 0,
        avgCostPerKwh: 0,
        totalSamples: 0,
      }
    }

    const chartData = primaryConsumption.map((point) => ({
      timestamp: point.timestamp,
      totalKwh: point.totalKwh,
      totalCost: point.totalCostKc,
      wholesaleKwh: point.components.wholesale.kwh,
      regulatedKwh: point.components.regulated.kwh,
      otherKwh: point.components.other?.kwh ?? 0,
      wholesaleCost: point.components.wholesale.costKc,
      regulatedCost: point.components.regulated.costKc,
      otherCost: point.components.other?.costKc ?? 0,
    }))

    const peakKwh = primaryConsumption.reduce(
      (acc, point) => Math.max(acc, point.peakKwh),
      primaryConsumption[0].peakKwh,
    )
    const baseLoadKwh = primaryConsumption.reduce(
      (acc, point) => Math.min(acc, point.baseLoadKwh),
      primaryConsumption[0].baseLoadKwh,
    )

    const totalCost = primaryConsumption.reduce((acc, point) => acc + point.totalCostKc, 0)
    const totalKwh = primaryConsumption.reduce((acc, point) => acc + point.totalKwh, 0)
    const avgCostPerKwh = totalKwh === 0 ? 0 : totalCost / totalKwh

    return {
      chartData,
      peakKwh,
      baseLoadKwh,
      avgCostPerKwh,
      totalSamples: primaryConsumption.length,
    }
  }, [primaryConsumption])

  if (chartData.length === 0) return null

  const isComponentActive = (component: 'wholesale' | 'regulated' | 'other') =>
    componentFilters.length === 0 || componentFilters.includes(component)

  const yAxisFormatter = (value: number) =>
    metric === 'energy' ? `${(value ?? 0).toFixed(2)} kWh` : formatCurrency(value ?? 0)

  return (
    <section className={styles.section} aria-labelledby="consumption-title">
      <header className={styles.header}>
        <div>
          <h2 id="consumption-title">Detailed consumption</h2>
          <p className={styles.subtitle}>
            {granularity === 'minute'
              ? 'Minute-level readings, stacked by cost component.'
              : `Aggregated by ${granularity}.`}
          </p>
        </div>
        <div className={styles.metricToggle} role="group" aria-label="Metric mode">
          <button
            type="button"
            className={metric === 'energy' ? styles.metricActive : ''}
            onClick={() => setMetric('energy')}
          >
            kWh
          </button>
          <button
            type="button"
            className={metric === 'cost' ? styles.metricActive : ''}
            onClick={() => setMetric('cost')}
          >
            Kč
          </button>
        </div>
      </header>

      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="wholesaleGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgba(79, 156, 255, 0.9)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="rgba(79, 156, 255, 0.05)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="regulatedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgba(124, 92, 255, 0.9)" stopOpacity={0.7} />
                <stop offset="95%" stopColor="rgba(124, 92, 255, 0.05)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="otherGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgba(45, 212, 191, 0.9)" stopOpacity={0.7} />
                <stop offset="95%" stopColor="rgba(45, 212, 191, 0.05)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(value) =>
                new Intl.DateTimeFormat('cs-CZ', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: 'short',
                }).format(new Date(value))
              }
              minTickGap={28}
              stroke="rgba(255,255,255,0.4)"
            />
            <YAxis tickFormatter={yAxisFormatter} stroke="rgba(255,255,255,0.4)" width={80} />
            <Tooltip
              contentStyle={{
                background: 'rgba(8, 12, 20, 0.95)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
              }}
              formatter={(value: number, key: string) =>
                metric === 'energy'
                  ? [`${value.toFixed(3)} kWh`, key.replace('Kwh', '')]
                  : [formatCurrency(value), key.replace('Cost', '')]
              }
              labelFormatter={(label) =>
                new Intl.DateTimeFormat('cs-CZ', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(label))
              }
            />
            <Legend />
            {isComponentActive('wholesale') && (
              <Area
                type="monotone"
                dataKey={metric === 'energy' ? 'wholesaleKwh' : 'wholesaleCost'}
                stroke={CHART_COLORS.wholesale}
                fill="url(#wholesaleGradient)"
                stackId="1"
                strokeWidth={2}
                name="Wholesale"
                dot={false}
              />
            )}
            {isComponentActive('regulated') && (
              <Area
                type="monotone"
                dataKey={metric === 'energy' ? 'regulatedKwh' : 'regulatedCost'}
                stroke={CHART_COLORS.regulated}
                fill="url(#regulatedGradient)"
                stackId="1"
                strokeWidth={2}
                name="Regulated"
                dot={false}
              />
            )}
            {isComponentActive('other') && (
              <Area
                type="monotone"
                dataKey={metric === 'energy' ? 'otherKwh' : 'otherCost'}
                stroke={CHART_COLORS.other}
                fill="url(#otherGradient)"
                stackId="1"
                strokeWidth={2}
                name="Other"
                dot={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <dl className={styles.stats}>
        <div>
          <dt>Peak load</dt>
          <dd>{formatKwh(peakKwh)}</dd>
        </div>
        <div>
          <dt>Base load</dt>
          <dd>{formatKwh(baseLoadKwh)}</dd>
        </div>
        <div>
          <dt>Avg cost / kWh</dt>
          <dd>{formatCurrency(avgCostPerKwh)} / kWh</dd>
        </div>
        <div>
          <dt>Samples</dt>
          <dd>{totalSamples.toLocaleString('cs-CZ')}</dd>
        </div>
      </dl>
    </section>
  )
}

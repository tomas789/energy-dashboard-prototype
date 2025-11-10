import { useId } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts'
import { clsx } from 'clsx'
import styles from './KpiCard.module.css'

interface KpiCardProps {
  title: string
  value: string
  deltaLabel?: string
  caption?: string
  sparkline?: Array<{ timestamp: string; value: number }>
  accent?: 'accent' | 'critical' | 'neutral'
}

export function KpiCard({
  title,
  value,
  deltaLabel,
  caption,
  sparkline,
  accent = 'accent',
}: KpiCardProps) {
  const gradientId = useId()

  return (
    <div className={clsx(styles.card, styles[`card--${accent}`])}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        {deltaLabel && <span className={styles.delta}>{deltaLabel}</span>}
      </div>
      <p className={styles.value}>{value}</p>
      {caption && <p className={styles.caption}>{caption}</p>}

      {sparkline && sparkline.length > 0 && (
        <div className={styles.sparkline}>
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={sparkline}>
              <defs>
                <linearGradient id={`sparkline-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgba(79, 156, 255, 0.75)" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="rgba(79, 156, 255, 0.1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  background: 'rgba(10,16,25,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                }}
                labelFormatter={(label) =>
                  new Intl.DateTimeFormat('cs-CZ', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(label))
                }
                formatter={(val: number) => val.toFixed(3)}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="rgba(79, 156, 255, 0.85)"
                fill={`url(#sparkline-${gradientId})`}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

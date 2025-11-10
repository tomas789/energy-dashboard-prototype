import { clsx } from 'clsx'
import { useDashboardStore } from '../../../store/dashboardStore'
import type { ConsumptionGranularity } from '../../../api/types'
import styles from './GranularitySelector.module.css'

const OPTIONS: Array<{ id: ConsumptionGranularity; label: string; hint: string }> = [
  { id: 'minute', label: '1m', hint: 'Minute detail' },
  { id: 'hour', label: '1h', hint: 'Hourly profile' },
  { id: 'day', label: '1d', hint: 'Daily trend' },
  { id: 'week', label: '1w', hint: 'Weekly aggregates' },
  { id: 'month', label: '1M', hint: 'Monthly rollup' },
]

export function GranularitySelector() {
  const granularity = useDashboardStore((state) => state.granularity)
  const setGranularity = useDashboardStore((state) => state.setGranularity)

  return (
    <div className={styles.root} role="group" aria-label="Granularity">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={clsx(styles.option, {
            [styles['option--active']]: option.id === granularity,
          })}
          onClick={() => setGranularity(option.id)}
        >
          <span className={styles.label}>{option.label}</span>
          <span className={styles.hint}>{option.hint}</span>
        </button>
      ))}
    </div>
  )
}
